FROM node:argon
MAINTAINER Soichiro Shishido
RUN npm install -g gulp mocha istanbul coveralls
WORKDIR src
CMD ["/bin/bash"]
