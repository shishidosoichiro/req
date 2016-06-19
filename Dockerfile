FROM node:argon
MAINTAINER Soichiro Shishido
RUN npm set progress=false
RUN npm install -g gulp-cli mocha istanbul coveralls
WORKDIR src
CMD ["/bin/bash"]
