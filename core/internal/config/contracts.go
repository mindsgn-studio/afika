package config

import (
	"errors"
	"os"
	"strings"
)

type Deployment struct {
	FactoryAddress        string
	ImplementationAddress string
}

var defaultDeployments = map[string]Deployment{
	"ethereum-sepolia": {
		FactoryAddress:        "0xF547f2c4fe3e1Ea59740CeF4E364cd479478f882",
		ImplementationAddress: "0xFc35f578db9a62C53cBd5c4b983Ab3234E2333f3",
	},
	"ethereum-mainnet": {
		FactoryAddress:        "",
		ImplementationAddress: "",
	},
}

func GetDeployment(network string) (Deployment, error) {
	network = strings.TrimSpace(strings.ToLower(network))
	deployment, ok := defaultDeployments[network]
	if !ok {
		return Deployment{}, errors.New("unsupported deployment network")
	}

	factoryEnv := envName(network, "FACTORY")
	implEnv := envName(network, "IMPLEMENTATION")

	if value := strings.TrimSpace(os.Getenv(factoryEnv)); value != "" {
		deployment.FactoryAddress = value
	}
	if value := strings.TrimSpace(os.Getenv(implEnv)); value != "" {
		deployment.ImplementationAddress = value
	}

	if deployment.FactoryAddress == "" {
		return Deployment{}, errors.New("missing factory address for network")
	}
	if deployment.ImplementationAddress == "" {
		return Deployment{}, errors.New("missing implementation address for network")
	}

	return deployment, nil
}

func envName(network string, kind string) string {
	name := strings.ToUpper(strings.ReplaceAll(network, "-", "_"))
	return "POCKET_" + kind + "_" + name
}
