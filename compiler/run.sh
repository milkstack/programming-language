#!/bin/bash

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "$parent_path"

mkdir -p output
rm -f output/test.ll output/test

npm start || exit 1

clang -w output/test.ll -o output/test
clang_exit=$?
if [ ! -f output/test ]; then
    echo "Error: Clang failed to compile ll -> binary"
    exit 1
fi


echo "Running outputted binary"
./output/test

echo $?
# echo "Output:"