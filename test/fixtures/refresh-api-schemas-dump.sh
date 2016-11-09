#!/bin/bash

MOZILLA_CLONE_DIR=$1
DEST_BASE_DIR=$2

BROWSER_SCHEMAS_PATH=browser/components/extensions/schemas/
TOOLKIT_SCHEMAS_PATH=toolkit/components/extensions/schemas/
VERSION_DISPLAY_PATH=browser/config/version_display.txt

echo "Syncing $MOZILLA_CLONE_DIR into $DEST_BASE_DIR"
echo "press any key to continue, ^C to quit"
read

cp $MOZILLA_CLONE_DIR/$TOOLKIT_SCHEMAS_PATH/* $DEST_BASE_DIR/$TOOLKIT_SCHEMAS_PATH/
cp $MOZILLA_CLONE_DIR/$BROWSER_SCHEMAS_PATH/* $DEST_BASE_DIR/$BROWSER_SCHEMAS_PATH/
cp $MOZILLA_CLONE_DIR/$VERSION_DISPLAY_PATH   $DEST_BASE_DIR/$VERSION_DISPLAY_PATH

echo "Syncing completed: Firefox $(cat $DEST_BASE_DIR/$VERSION_DISPLAY_PATH)"

echo -e "\nToolkit WebExtensions API:\n"
ls $DEST_BASE_DIR/$TOOLKIT_SCHEMAS_PATH/

echo -e "\nBrowser WebExtensions API:\n"
ls $DEST_BASE_DIR/$BROWSER_SCHEMAS_PATH/
