import { Server as HttpServer } from 'http';
import { EventEmitter } from 'events';

export const wsBroadcaster = new EventEmitter();

export function setupWebSocketServer(server: HttpServer) {
  console.log('⚡ WebSocket Event Broadcaster initialized for Real-Time events');

  wsBroadcaster.on('order.placed', (data) => {
    console.log('📡 [WS Broadcast] order.placed:', data);
  });

  wsBroadcaster.on('order.status.updated', (data) => {
    console.log('📡 [WS Broadcast] order.status.updated:', data);
  });

  wsBroadcaster.on('order.otp.verified', (data) => {
    console.log('📡 [WS Broadcast] order.otp.verified:', data);
  });

  wsBroadcaster.on('payment.split.success', (data) => {
    console.log('📡 [WS Broadcast] payment.split.success:', data);
  });

  wsBroadcaster.on('delivery.location.updated', (data) => {
    console.log('📡 [WS Broadcast] delivery.location.updated:', data);
  });

  wsBroadcaster.on('inventory.low_stock', (data) => {
    console.log('📡 [WS Broadcast] inventory.low_stock:', data);
  });

  wsBroadcaster.on('kyc.status.updated', (data) => {
    console.log('📡 [WS Broadcast] kyc.status.updated:', data);
  });

  wsBroadcaster.on('notification.new', (data) => {
    console.log('📡 [WS Broadcast] notification.new:', data);
  });
}
