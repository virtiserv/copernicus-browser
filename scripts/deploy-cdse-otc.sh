#!/bin/bash

# Load .env file
if [[ -f ".env" ]]; then
  source .env
else
  echo "Error: .env file not found."
  exit 1
fi

required_vars=("GITLAB_API_TOKEN" "CDAS_OTC_FTP_USERNAME" "CDAS_OTC_FTP_PASSWORD" "CDAS_OTC_FTP_HOST")

# Check if all required variables are set
for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "Error: $var is not set."
    exit 1
  fi
done

# Check if tag is provided as an argument
if [ $# -eq 0 ]; then
  echo "Error: 'tag' is not provided. Use -- tag"
  exit 1
fi

tag="$1"

source "$(dirname "$0")/lib/download-artifact.sh"

job_name="build_otc_cdse"
ref_name="$tag"
artifact_dir_name="build_prod_cdas"

target_path="browser"
temp_local_path="deploy/otc"

download_artifact "$job_name" "$ref_name" "$artifact_dir_name" "$temp_local_path"

echo "Upload from local to target"
lftp -e "set mirror:parallel-transfer-count 4; mirror -R --delete --overwrite $temp_local_path/$artifact_dir_name $target_path ; exit" -u $CDAS_OTC_FTP_USERNAME,$CDAS_OTC_FTP_PASSWORD $CDAS_OTC_FTP_HOST

rm -rf "$temp_local_path"
echo "Deployment completed"
