package server

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apiserver/pkg/server/dynamiccertificates"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/cache"
	// "k8s.io/client-go/tools/clientcmd"
)

var log = logrus.WithField("module", "server")

type Config struct {
	Port             int
	CertFile         string
	PrivateKeyFile   string
	Features         map[string]bool
	StaticPath       string
	ConfigPath       string
	PluginConfigPath string
	LogLevel         string
}

type PluginConfig struct {
	Timeout time.Duration `json:"timeout,omitempty" yaml:"timeout,omitempty"`
}

func (pluginConfig *PluginConfig) MarshalJSON() ([]byte, error) {
	type Alias PluginConfig
	return json.Marshal(&struct {
		Timeout float64 `json:"timeout,omitempty"`
		*Alias
	}{
		Timeout: pluginConfig.Timeout.Seconds(),
		Alias:   (*Alias)(pluginConfig),
	})
}

func watchSecrets(clientset *kubernetes.Clientset) {
	// Start the informer for Secrets
	informerFactory := informers.NewSharedInformerFactory(clientset, time.Second*30)
	secretInformer := informerFactory.Core().V1().Secrets().Informer()

	// Define the event handlers
	secretInformer.AddEventHandler(
		cache.ResourceEventHandlerFuncs{
			AddFunc: func(obj interface{}) {
				secret := obj.(*v1.Secret)
				fmt.Printf("New Secret added: %s\n", secret.Name)
			},
			UpdateFunc: func(oldObj, newObj interface{}) {
				secret := newObj.(*v1.Secret)
				fmt.Printf("Secret updated: %s\n", secret.Name)
			},
			DeleteFunc: func(obj interface{}) {
				secret := obj.(*v1.Secret)
				fmt.Printf("Secret deleted: %s\n", secret.Name)
			},
		},
	)

	// Start informer and wait for events
	stopCh := make(chan struct{})
	defer close(stopCh)
	informerFactory.Start(stopCh)

	// Block until an interrupt signal
	<-stopCh
}

func Start(cfg *Config) {
	router, pluginConfig := setupRoutes(cfg)
	router.Use(corsHeaderMiddleware())

	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
	}

	timeout := 30 * time.Second
	if pluginConfig != nil {
		timeout = pluginConfig.Timeout
	}

	// JZ TEST
	// Get the Kubernetes config and client
	// config, err := clientcmd.BuildConfigFromFlags("", "/Users/jezhu/.kube/config")
	config, err := rest.InClusterConfig()
	if err != nil {
		log.Fatalf("Failed to build config: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("Failed to create Kubernetes client: %v", err)
	}

	tlsEnabled := cfg.CertFile != "" && cfg.PrivateKeyFile != ""
	if tlsEnabled {
		// Build and run the controller which reloads the certificate and key
		// files whenever they change.
		certKeyPair, err := dynamiccertificates.NewDynamicServingContentFromFiles("serving-cert", cfg.CertFile, cfg.PrivateKeyFile)
		if err != nil {
			logrus.WithError(err).Fatal("unable to create TLS controller")
		}
		ctrl := dynamiccertificates.NewDynamicServingCertificateController(
			tlsConfig,
			nil,
			certKeyPair,
			nil,
			nil,
		)

		// Check that the cert and key files are valid.
		if err := ctrl.RunOnce(); err != nil {
			logrus.WithError(err).Fatal("invalid certificate/key files")
		}

		ctx := context.Background()
		go ctrl.Run(1, ctx.Done())
	}

	logrusLevel, err := logrus.ParseLevel(cfg.LogLevel)
	if err != nil {
		logrus.WithError(err).Fatal("unable to set the log level")
		logrusLevel = logrus.ErrorLevel
	}

	httpServer := &http.Server{
		Handler:      router,
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		TLSConfig:    tlsConfig,
		ReadTimeout:  timeout,
		WriteTimeout: timeout,
	}

	if logrusLevel == logrus.TraceLevel {
		loggedRouter := handlers.LoggingHandler(log.Logger.Out, router)
		httpServer.Handler = loggedRouter
	}

	go func() {
		watchSecrets(clientset)
		fmt.Printf("watchSecrets starting...")
	}()

	go func() {
		if tlsEnabled {
			log.Infof("listening on https://:%d", cfg.Port)
			logrus.SetLevel(logrusLevel)
			panic(httpServer.ListenAndServeTLS(cfg.CertFile, cfg.PrivateKeyFile))
		} else {
			log.Infof("listening on http://:%d", cfg.Port)
			logrus.SetLevel(logrusLevel)
			panic(httpServer.ListenAndServe())
		}
	}()

	select {}

}

func setupRoutes(cfg *Config) (*mux.Router, *PluginConfig) {
	configHandlerFunc, pluginConfig := configHandler(cfg)

	router := mux.NewRouter()

	router.PathPrefix("/health").HandlerFunc(healthHandler())
	router.Path("/plugin-manifest.json").Handler(manifestHandler(cfg))
	router.PathPrefix("/features").HandlerFunc(featuresHandler(cfg))
	router.PathPrefix("/config").HandlerFunc(configHandlerFunc)
	router.PathPrefix("/").Handler(filesHandler(http.Dir(cfg.StaticPath)))

	return router, pluginConfig
}

func filesHandler(root http.FileSystem) http.Handler {
	fileServer := http.FileServer(root)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		filePath := r.URL.Path

		// disable caching for plugin entry point
		if strings.HasPrefix(filePath, "/plugin-entry.js") {
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Expires", "0")
		}

		fileServer.ServeHTTP(w, r)
	})
}

func healthHandler() http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
}

func corsHeaderMiddleware() func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			headers := w.Header()
			headers.Set("Access-Control-Allow-Origin", "*")
			next.ServeHTTP(w, r)
		})
	}
}

func featuresHandler(cfg *Config) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		jsonFeatures, err := json.Marshal(cfg.Features)

		if err != nil {
			log.WithError(err).Errorf("cannot marshall, features were: %v", string(jsonFeatures))
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(jsonFeatures)
	})
}

func configHandler(cfg *Config) (http.HandlerFunc, *PluginConfig) {
	pluginConfData, err := os.ReadFile(cfg.PluginConfigPath)

	if err != nil {
		log.WithError(err).Warnf("cannot read config file, serving plugin with default configuration, tried %s", cfg.PluginConfigPath)

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte("{}"))
		}), nil
	}

	var pluginConfig PluginConfig
	err = yaml.Unmarshal(pluginConfData, &pluginConfig)

	if err != nil {
		log.WithError(err).Error("unable to unmarshall config data")
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "unable to unmarshall config data", http.StatusInternalServerError)
		}), nil
	}

	jsonPluginConfig, err := pluginConfig.MarshalJSON()

	if err != nil {
		log.WithError(err).Errorf("unable to marshall, config data: %v", pluginConfig)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "unable to marshall config data", http.StatusInternalServerError)
		}), nil
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(jsonPluginConfig)
	}), &pluginConfig
}
