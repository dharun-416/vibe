#!/bin/sh
release_date="20250604"
exportfilename="cpython-3.10.18+20250604-aarch64-apple-darwin-install_only.tar.gz"
standalone_python="..python/"
if [ ! -d "$standalone_python" ]; then
    wget https://github.com/indygreg/python-build-standalone/releases/download/${release_date}/${filename}
    tar -xzvf ${filename}                                                                          
    rm -rf ${filename}
    rm -rf python/lib/python3.10/test
fi