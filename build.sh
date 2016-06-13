#!/bin/sh
docker rmi node:dev
docker build -t node:dev .
