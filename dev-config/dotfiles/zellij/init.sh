#!/bin/bash

source $HOME/.rvm/scripts/rvm
cd "$PWD"
rvm use .

# exec shell with received arguments
exec $SHELL