#!/bin/bash
set -euo pipefail

# Function for cleanup
cleanup() {
  echo "Cleaning up temporary directory..."
  rm -rf /tmp/temp_repo
}

# Set trap to ensure cleanup happens even on failure
trap cleanup EXIT

# Validate input parameters
if [ $# -ne 5 ]; then
  echo "Error: Script requires exactly 5 parameters"
  echo "Usage: $0 <environment> <image-tag> <image-repository> <repo-url> <deployment-file-name>"
  exit 1
fi

ENVIRONMENT="$1"
IMAGE_TAG="$2"
IMAGE_REPOSITORY="$3"
REPO_URL="$4"
DEPLOYMENT_FILE_NAME="$5"

echo "Starting K8s manifest update process..."
echo "Environment: $ENVIRONMENT"
echo "Image Tag: $IMAGE_TAG"
echo "Image Repository: $IMAGE_REPOSITORY"
echo "Repository URL: $REPO_URL"
echo "Deployment File Name: $DEPLOYMENT_FILE_NAME"

# Clean up any existing temp directory before starting
echo "Cleaning up any existing temporary directory..."
rm -rf /tmp/temp_repo

echo "Cloning repository: $REPO_URL"
# Clone the git repository into the /tmp directory
if ! git clone "$REPO_URL" /tmp/temp_repo; then
  echo "Error: Failed to clone repository"
  exit 1
fi

# Navigate into the cloned repository directory
cd /tmp/temp_repo || {
  echo "Error: Failed to navigate to cloned repository"
  exit 1
}

cd kube

cd "$ENVIRONMENT"
ls -la

# Check if deployment file exists
DEPLOYMENT_FILE="$DEPLOYMENT_FILE_NAME"
if [ ! -f "$DEPLOYMENT_FILE" ]; then
  echo "Error: Deployment file '$DEPLOYMENT_FILE' not found"
  exit 1
fi

echo "Updating deployment file: $DEPLOYMENT_FILE"
echo "Before update:"
grep -n "$IMAGE_REPOSITORY" "$DEPLOYMENT_FILE" || echo "No matching image repository found"

# Extract the base image name (without tag) from IMAGE_REPOSITORY
# This handles cases like: registry.example.com/app-name
BASE_IMAGE_NAME="${IMAGE_REPOSITORY##*/}"  # Gets the part after the last /

echo "Base image name: $BASE_IMAGE_NAME"
echo "Searching for pattern: $BASE_IMAGE_NAME:*"

# Replace ALL instances matching the pattern {imageName}:dev-* or {imageName}:*
# This uses a more flexible regex to match any tag format
if ! sed -i -E "s|(${IMAGE_REPOSITORY}):([a-zA-Z0-9._-]+)|\1:${IMAGE_TAG}|g" "$DEPLOYMENT_FILE"; then
  echo "Error: Failed to update deployment file"
  exit 1
fi

echo "After update:"
grep -n "$IMAGE_REPOSITORY" "$DEPLOYMENT_FILE" || {
  echo "Error: Image repository not found after update - sed command may have failed"
  exit 1
}

# Show the number of replacements made
REPLACEMENT_COUNT=$(grep -c "$IMAGE_REPOSITORY:$IMAGE_TAG" "$DEPLOYMENT_FILE" || echo "0")
echo "Number of image references updated: $REPLACEMENT_COUNT"

# Configure git user
git config user.email "pharanyuc@betagro.com" || {
  echo "Error: Failed to set git user email"
  exit 1
}
git config user.name "pharanyuc" || {
  echo "Error: Failed to set git user name"
  exit 1
}

# Check if there are any changes to commit
if git diff --quiet && git diff --staged --quiet; then
  echo "No changes detected in manifest files"
  exit 0
fi

echo "Showing changes made:"
git diff "$DEPLOYMENT_FILE"

echo "Adding modified files to git..."
# Add the modified files
if ! git add .; then
  echo "Error: Failed to add files to git"
  exit 1
fi

echo "Committing changes..."
# Commit the changes
if ! git commit -m "Update Kubernetes manifest - Environment: $ENVIRONMENT, Tag: $IMAGE_TAG (${REPLACEMENT_COUNT} instances updated)"; then
  echo "Error: Failed to commit changes"
  exit 1
fi

echo "Pushing changes to repository..."
# Push the changes back to the repository
if ! git push; then
  echo "Error: Failed to push changes to repository"
  exit 1
fi

echo "Successfully updated K8s manifest and pushed changes!"