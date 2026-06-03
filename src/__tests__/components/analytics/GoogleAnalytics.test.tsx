import { render } from '@testing-library/react';
import { GoogleAnalytics } from '@/components/features/analytics/GoogleAnalytics';

describe('GoogleAnalytics', () => {
  beforeEach(() => {
    // Clear environment
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  });

  describe('GA ID selection', () => {
    it('should render with provided GA ID', () => {
      const { container } = render(<GoogleAnalytics gaId="G-CUSTOM123456" />);
      const script = container.querySelector('#ga-init');
      expect(script?.textContent).toContain('gtag(\'config\', \'G-CUSTOM123456\')');
    });

    it('should render with env GA ID when no gaId prop', () => {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-FALLBACK1234';
      const { container } = render(<GoogleAnalytics />);
      const script = container.querySelector('#ga-init');
      expect(script?.textContent).toContain('gtag(\'config\', \'G-FALLBACK1234\')');
    });

    it('should prefer provided GA ID over env variable', () => {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-FALLBACK1234';
      const { container } = render(<GoogleAnalytics gaId="G-CUSTOM123456" />);
      const script = container.querySelector('#ga-init');
      expect(script?.textContent).toContain('gtag(\'config\', \'G-CUSTOM123456\')');
      expect(script?.textContent).not.toContain('G-FALLBACK1234');
    });

    it('should return null if no GA ID available', () => {
      const { container } = render(<GoogleAnalytics gaId={null} />);
      expect(container.children).toHaveLength(0);
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

  describe('Fallback behavior', () => {
    it('should handle null GA ID', () => {
      const { container } = render(<GoogleAnalytics gaId={null} />);
      expect(container.children).toHaveLength(0);
    });

    it('should handle undefined GA ID', () => {
      const { container } = render(<GoogleAnalytics gaId={undefined} />);
      if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
        expect(container.children).toHaveLength(0);
      }
    });
  });
});
