#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${ENVIRONMENT:-"dev"}
LOCATION=${AZURE_REGION:-"eastus2"}
BASE_NAME=${BASE_NAME:-"botel-voice"}
SUBSCRIPTION_ID=""

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -l|--location)
            LOCATION="$2"
            shift 2
            ;;
        -n|--name)
            BASE_NAME="$2"
            shift 2
            ;;
        -s|--subscription)
            SUBSCRIPTION_ID="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: ./deploy.sh [OPTIONS]"
            echo "Options:"
            echo "  -e, --environment    Environment (dev/test/prod) - default: dev"
            echo "  -l, --location       Azure region - default: eastus2"
            echo "  -n, --name          Base name for resources - default: botel-voice"
            echo "  -s, --subscription  Azure subscription ID"
            echo "  -h, --help          Show this help message"
            exit 0
            ;;
        *)
            print_message $RED "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_message $GREEN "🚀 Starting Botel AI Voice Agent Infrastructure Deployment"
print_message $YELLOW "Environment: $ENVIRONMENT"
print_message $YELLOW "Location: $LOCATION"
print_message $YELLOW "Base Name: $BASE_NAME"

# Check if logged in to Azure
if ! az account show &>/dev/null; then
    print_message $RED "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Set subscription if provided
if [[ -n "$SUBSCRIPTION_ID" ]]; then
    print_message $YELLOW "Setting subscription to: $SUBSCRIPTION_ID"
    az account set --subscription "$SUBSCRIPTION_ID"
fi

# Get current subscription
CURRENT_SUB=$(az account show --query name -o tsv)
print_message $YELLOW "Using subscription: $CURRENT_SUB"

# Create deployment name
TIMESTAMP=$(date +%Y%m%d%H%M%S)
DEPLOYMENT_NAME="botel-voice-$ENVIRONMENT-$TIMESTAMP"

# Deploy the infrastructure
print_message $GREEN "📦 Deploying infrastructure..."
if az deployment sub create \
    --name "$DEPLOYMENT_NAME" \
    --location "$LOCATION" \
    --template-file main.bicep \
    --parameters \
        location="$LOCATION" \
        environment="$ENVIRONMENT" \
        baseName="$BASE_NAME" \
    --output json; then
    
    print_message $GREEN "✅ Deployment completed successfully!"
    
    # Get outputs
    print_message $GREEN "\n📋 Deployment Outputs:"
    OUTPUTS=$(az deployment sub show \
        --name "$DEPLOYMENT_NAME" \
        --query properties.outputs \
        --output json)
    
    echo "$OUTPUTS" | jq .
    
    # Save outputs to file
    OUTPUT_FILE="deployment-outputs-$ENVIRONMENT.json"
    echo "$OUTPUTS" > "$OUTPUT_FILE"
    
    print_message $GREEN "\n💾 Outputs saved to: $OUTPUT_FILE"
    
    # Extract important values
    RG_NAME=$(echo "$OUTPUTS" | jq -r '.resourceGroupName.value')
    KV_NAME=$(echo "$OUTPUTS" | jq -r '.keyVaultName.value')
    APP_URL=$(echo "$OUTPUTS" | jq -r '.containerAppUrl.value')
    
    print_message $GREEN "\n🎯 Quick Access Info:"
    print_message $YELLOW "Resource Group: $RG_NAME"
    print_message $YELLOW "Key Vault: $KV_NAME"
    print_message $YELLOW "Media Worker URL: https://$APP_URL"
    
    # Verify secrets were stored in Key Vault
    print_message $GREEN "\n🔐 Verifying secrets in Key Vault..."
    
    SECRETS=("acs-connection-string" "speech-key" "cosmos-key" "agent-system-prompt")
    SECRETS_STORED=true
    
    for SECRET_NAME in "${SECRETS[@]}"; do
        if SECRET=$(az keyvault secret show \
            --vault-name "$KV_NAME" \
            --name "$SECRET_NAME" \
            --query "name" -o tsv 2>/dev/null); then
            
            print_message $GREEN "✅ Secret '$SECRET_NAME' is stored in Key Vault"
        else
            print_message $RED "❌ Secret '$SECRET_NAME' not found in Key Vault"
            SECRETS_STORED=false
        fi
    done
    
    if $SECRETS_STORED; then
        print_message $GREEN "\n✅ All secrets successfully stored in Key Vault!"
        print_message $CYAN "No manual configuration needed - everything is automated! 🎉"
    fi
    
    # Show how to retrieve secrets if needed
    print_message $YELLOW "\n📌 To retrieve secrets (if needed):"
    echo "az keyvault secret show --vault-name $KV_NAME --name acs-connection-string --query value -o tsv"
    echo "az keyvault secret show --vault-name $KV_NAME --name speech-key --query value -o tsv"
    echo "az keyvault secret show --vault-name $KV_NAME --name cosmos-key --query value -o tsv"
    
    print_message $GREEN "\n📝 Next Steps:"
    echo "1. Build and push the media worker container image"
    echo "2. The container app will automatically use the secrets from Key Vault"
    echo "3. Configure phone numbers in Azure Communication Services"
    echo "4. Test the voice agent at: https://$APP_URL"
    
else
    print_message $RED "❌ Deployment failed!"
    exit 1
fi 