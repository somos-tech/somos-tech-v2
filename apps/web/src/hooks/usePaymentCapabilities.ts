import { useState, useEffect } from 'react';

interface PaymentCapabilities {
  supportsApplePay: boolean;
  supportsGooglePay: boolean;
  supportsPaymentRequest: boolean;
  isAppleDevice: boolean;
  isAndroidDevice: boolean;
}

export function usePaymentCapabilities(): PaymentCapabilities {
  const [capabilities, setCapabilities] = useState<PaymentCapabilities>({
    supportsApplePay: false,
    supportsGooglePay: false,
    supportsPaymentRequest: false,
    isAppleDevice: false,
    isAndroidDevice: false,
  });

  useEffect(() => {
    const detectCapabilities = async () => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Detect Apple devices (iOS, iPadOS, macOS)
      const isAppleDevice = /iphone|ipad|ipod|macintosh|mac os x/.test(userAgent);
      
      // Detect Android devices
      const isAndroidDevice = /android/.test(userAgent);
      
      // Check if Payment Request API is supported
      const supportsPaymentRequest = 'PaymentRequest' in window;
      
      // Detect Apple Pay support
      let supportsApplePay = false;
      if (supportsPaymentRequest && isAppleDevice) {
        try {
          // @ts-ignore - ApplePaySession might not be in all TypeScript definitions
          supportsApplePay = 'ApplePaySession' in window && window.ApplePaySession?.canMakePayments();
        } catch (e) {
          // ApplePaySession not available
          supportsApplePay = false;
        }
      }
      
      // Detect Google Pay support (available on Android and Chrome)
      let supportsGooglePay = false;
      if (supportsPaymentRequest) {
        try {
          const paymentMethods = [
            {
              supportedMethods: 'https://google.com/pay',
              data: {
                apiVersion: 2,
                apiVersionMinor: 0,
              },
            },
          ];
          
          const paymentRequest = new PaymentRequest(
            paymentMethods,
            {
              total: {
                label: 'Test',
                amount: { currency: 'USD', value: '0.01' },
              },
            }
          );
          
          supportsGooglePay = await paymentRequest.canMakePayment();
        } catch (e) {
          // Google Pay not available
          supportsGooglePay = false;
        }
      }
      
      setCapabilities({
        supportsApplePay,
        supportsGooglePay,
        supportsPaymentRequest,
        isAppleDevice,
        isAndroidDevice,
      });
      
      // Log for debugging
      console.log('Payment Capabilities:', {
        supportsApplePay,
        supportsGooglePay,
        supportsPaymentRequest,
        isAppleDevice,
        isAndroidDevice,
        userAgent: navigator.userAgent,
      });
    };

    detectCapabilities();
  }, []);

  return capabilities;
}
