#!/bin/bash

# Load .env file
if [[ -f ".env" ]]; then
  source .env
else
  echo "Error: .env file not found."
  exit 1
fi

required_vars=("GITLAB_API_TOKEN" "CDAS_STAGING_FTP_USERNAME" "CDAS_STAGING_FTP_PASSWORD" "CDAS_STAGING_FTP_HOST")

# Check if all required variables are set
for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "Error: $var is not set."
    exit 1
  fi
done

source "$(dirname "$0")/lib/download-artifact.sh"

job_name="build_staging_cdse"
ref_name="main"
artifact_dir_name="build_staging"

target_path="browser"
temp_local_path="deploy/stage"

download_artifact "$job_name" "$ref_name" "$artifact_dir_name" "$temp_local_path"

echo "Upload from local to target"
lftp -e "mirror -R --delete-first --transfer-all --upload-older $temp_local_path/$artifact_dir_name $target_path ; exit" -u $CDAS_STAGING_FTP_USERNAME,$CDAS_STAGING_FTP_PASSWORD $CDAS_STAGING_FTP_HOST

rm -rf "$temp_local_path"