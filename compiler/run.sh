#!/bin/bash

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "$parent_path"

npx ts-node src/main.ts

clang output/output.ll -o output/output

./output/output

echo $?
# echo "Output:"