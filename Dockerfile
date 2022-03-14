# syntax=docker/dockerfile:1
FROM node:14.17.6-alpine

ARG FFMPEG_VERSION=4.4
ARG MAKEFLAGS="-j4"

# FFmpeg build dependencies.
RUN apk add --update \
  build-base \
  coreutils \
  freetype-dev \
  gcc \
  opus-dev \
  openssl \
  openssl-dev \
  pkgconf \
  pkgconfig \
  wget \
  x264-dev \
  x265-dev \
  yasm

# Get fdk-aac from community.
RUN echo http://dl-cdn.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
  apk add --update fdk-aac-dev

# Get ffmpeg source.
RUN cd /tmp/ && \
  wget http://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.gz && \
  tar zxf ffmpeg-${FFMPEG_VERSION}.tar.gz && rm ffmpeg-${FFMPEG_VERSION}.tar.gz

# Compile ffmpeg.
RUN cd /tmp/ffmpeg-${FFMPEG_VERSION} && \
  ./configure \
  --enable-version3 \
  --enable-gpl \
  --enable-nonfree \
  --enable-small \
  --enable-libx264 \
  --enable-libx265 \
  --enable-libopus \
  --enable-libfdk-aac \
  --enable-postproc \
  --enable-libfreetype \
  --enable-openssl \
  --disable-debug \
  --disable-doc \
  --disable-ffplay \
  --extra-cflags="-I/opt/ffmpeg/include" \
  --extra-ldflags="-L/opt/ffmpeg/lib" \
  --extra-libs="-lpthread -lm" \
  --prefix="/opt/ffmpeg" && \
  make && make install && make distclean

WORKDIR /yure

RUN mkdir -p ./cache

COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --immutable --immutable-cache --check-cache

RUN yarn global add pm2

COPY . .
RUN yarn build

ENV PATH="$PATH:/opt/ffmpeg/bin"

CMD ["yarn", "pm2"]