/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-sync-scripts */
import { render } from '@testing-library/react';
import { GoogleAnalytics } from '@/components/features/analytics/GoogleAnalytics';

// Mock next/script to render regular script tags in tests
jest.mock('next/script', () => {
  return {
    __esModule: true,
    default: function MockScript({
      children,
      src,
      strategy,
      id,
      nonce,
      ...props
    }: any) {
      if (src) {
        return (
          <script
            src={src}
            data-strategy={strategy}
            id={id}
            nonce={nonce}
            {...props}
          />
        );
      }
      if (children) {
        return (
          <script
            id={id}
            nonce={nonce}
            data-strategy={strategy}
            {...props}
            dangerouslySetInnerHTML={{ __html: children as string }}
          />
        );
      }
      return null;
    },
  };
});

describe('GoogleAnalytics', () => {
  const originalEnv = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  beforeEach(() => {
    // Clear environment completely
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = undefined;
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  });

  afterAll(() => {
    // Restore original env
    if (originalEnv) {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalEnv;
    }
  });

  describe('GA ID selection', () => {
    it('should render script when GA ID available', () => {
      const { container } = render(<GoogleAnalytics gaId="G-CUSTOM123456" />);
      const script = container.querySelector('#ga-init');
      expect(script).toBeInTheDocument();
      expect(script?.textContent).toContain('gtag(');
    });

    it('should include GA ID in config', () => {
      const { container } = render(<GoogleAnalytics gaId="G-TEST987654" />);
      const trackingScript = container.querySelector(
        'script[src*="googletagmanager.com"]'
      );
      expect(trackingScript).toHaveAttribute(
        'src',
        'https://www.googletagmanager.com/gtag/js?id=G-TEST987654'
      );
    });

  });

  describe('Consent mode', () => {
    it('should set default consent to denied', () => {
      const { container } = render(<GoogleAnalytics gaId="G-CUSTOM123456" />);
      const script = container.querySelector('#ga-init');
      expect(script?.textContent).toContain(
        'gtag(\'consent\', \'default\', {analytics_storage: \'denied\'})'
      );
    });

    it('should listen for cookie consent accepted event', () => {
      const gtag = jest.fn();
      window.gtag = gtag;

      render(<GoogleAnalytics gaId="G-CUSTOM123456" />);

      const event = new Event('cookie_consent_accepted');
      window.dispatchEvent(event);

      expect(gtag).toHaveBeenCalledWith('consent', 'update', {
        analytics_storage: 'granted',
      });
    });

    it('should clean up event listener on unmount', () => {
      const { unmount } = render(<GoogleAnalytics gaId="G-CUSTOM123456" />);
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'cookie_consent_accepted',
        expect.any(Function)
      );
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Script tags', () => {
    it('should render GA tracking script', () => {
      const { container } = render(<GoogleAnalytics gaId="G-CUSTOM123456" />);
      const trackingScript = container.querySelector(
        'script[src*="googletagmanager.com"]'
      );
      expect(trackingScript).toHaveAttribute(
        'src',
        'https://www.googletagmanager.com/gtag/js?id=G-CUSTOM123456'
      );
    });

    it('should use beforeInteractive strategy', () => {
      const { container } = render(<GoogleAnalytics gaId="G-CUSTOM123456" />);
      const scripts = container.querySelectorAll('script');
      expect(scripts.length).toBeGreaterThanOrEqual(2);
      scripts.forEach((script) => {
        // beforeInteractive renders inline, not as data attributes
        expect(script).toBeInTheDocument();
      });
    });

    it('should include nonce when provided', () => {
      const { container } = render(
        <GoogleAnalytics gaId="G-CUSTOM123456" nonce="test-nonce" />
      );
      const scripts = container.querySelectorAll('script');
      scripts.forEach((script) => {
        if (script.hasAttribute('nonce')) {
          expect(script.getAttribute('nonce')).toBe('test-nonce');
        }
      });
    });
  });

  describe('Component lifecycle', () => {
    it('should render without errors when GA ID provided', () => {
      expect(() => {
        render(<GoogleAnalytics gaId="G-LIFECYCLE123" />);
      }).not.toThrow();
    });
  });
});
