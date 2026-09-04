const http = require("http");
const https = require("https");
const net = require("net");
const tls = require("tls");
const dgram = require("dgram");
const dns = require("dns");

function blocked(operation) {
  return function networkBlocked() {
    throw new Error(`Acesso de rede bloqueado durante validação offline: ${operation}`);
  };
}

http.request = blocked("http.request");
http.get = blocked("http.get");
https.request = blocked("https.request");
https.get = blocked("https.get");
net.connect = blocked("net.connect");
net.createConnection = blocked("net.createConnection");
tls.connect = blocked("tls.connect");
dns.lookup = blocked("dns.lookup");
dns.resolve = blocked("dns.resolve");

const originalCreateSocket = dgram.createSocket;
dgram.createSocket = function createBlockedSocket(...args) {
  const socket = originalCreateSocket.apply(this, args);
  socket.send = blocked("dgram.send");
  socket.connect = blocked("dgram.connect");
  return socket;
};
