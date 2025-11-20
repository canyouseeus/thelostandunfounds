/**
 * About Page
 */

import { useState, useEffect, useRef } from 'react';

export default function About() {
  const [animationKey, setAnimationKey] = useState(0);
  const merchRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyTextRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scale heading to fit container width perfectly - measure exact text boundaries like Illustrator snap-to-edge
  useEffect(() => {
    const scaleHeading = () => {
      if (!headingRef.current || !bodyTextRef.current) return;

      const bodyText = bodyTextRef.current;
      const heading = headingRef.current;
      
      // Simply measure the body text container width - this is our target
      // Both heading and body text are siblings, so they share the same container width
      const bodyTextWidth = bodyText.offsetWidth;
      const bodyTextStyle = window.getComputedStyle(bodyText);
      
      // Account for any padding on the body text container
      const bodyPaddingLeft = parseFloat(bodyTextStyle.paddingLeft) || 0;
      const bodyPaddingRight = parseFloat(bodyTextStyle.paddingRight) || 0;
      
      // This is the exact width available for text content
      const targetWidth = bodyTextWidth - bodyPaddingLeft - bodyPaddingRight;
      
      // Get computed styles from heading
      const headingStyle = window.getComputedStyle(heading);
      const fontWeight = headingStyle.fontWeight;
      const letterSpacing = headingStyle.letterSpacing;
      const fontFamily = headingStyle.fontFamily;
      const textContent = heading.textContent || '';
      
      // Start with a large font size to measure accurately
      const testFontSize = 100;
      
      // Create a temporary span to measure text width accurately
      const tempSpan = document.createElement('span');
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.top = '-9999px';
      tempSpan.style.left = '-9999px';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.fontSize = `${testFontSize}px`;
      tempSpan.style.fontWeight = fontWeight;
      tempSpan.style.letterSpacing = letterSpacing;
      tempSpan.style.fontFamily = fontFamily;
      tempSpan.style.fontStyle = headingStyle.fontStyle;
      tempSpan.style.textTransform = headingStyle.textTransform;
      tempSpan.textContent = textContent;
      document.body.appendChild(tempSpan);
      
      const textWidth = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);
      
      if (textWidth === 0 || targetWidth === 0 || targetWidth <= 0) return;
      
      // Calculate the exact font size that fits the target width
      // Use 90% to ensure we're well within the boundaries - text should never overflow
      const scale = (targetWidth / textWidth) * 0.90;
      const finalFontSize = testFontSize * scale;
      
      // Apply the calculated font size and constrain width exactly
      heading.style.fontSize = `${finalFontSize}px`;
      heading.style.width = `${targetWidth}px`;
      heading.style.maxWidth = `${targetWidth}px`;
      heading.style.marginLeft = '0';
      heading.style.marginRight = '0';
      heading.style.paddingLeft = '0';
      heading.style.paddingRight = '0';
      heading.style.boxSizing = 'border-box';
      heading.style.overflow = 'hidden';
    };

    // Use multiple strategies to ensure it runs after render
    const runScale = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scaleHeading();
        });
      });
    };

    // Initial scale
    runScale();

    // Scale on resize with debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        runScale();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    
    // Also use ResizeObserver for more accurate detection
    const resizeObserver = new ResizeObserver(() => {
      runScale();
    });
    
    if (bodyTextRef.current) {
      resizeObserver.observe(bodyTextRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start animation 3 seconds after section becomes visible
            timeoutRef.current = setTimeout(() => {
              setAnimationKey((prev) => prev + 1);
              
              // Set up interval to repeat every 3 seconds
              intervalRef.current = setInterval(() => {
                setAnimationKey((prev) => prev + 1);
              }, 3000);
            }, 3000);
          } else {
            // Reset when section is not visible
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setAnimationKey(0);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (merchRef.current) {
      observer.observe(merchRef.current);
    }

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div ref={containerRef} style={{ width: '100%', boxSizing: 'border-box' }}>
        <h1 
          ref={headingRef}
          className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-8 tracking-wide" 
          style={{ 
            fontWeight: 900, 
            letterSpacing: '0.1em', 
            width: '100%', 
            maxWidth: '100%',
            boxSizing: 'border-box', 
            margin: '0 0 2rem 0', 
            padding: 0, 
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'clip'
          }}
        >
          ABOUT : THE LOST+UNFOUNDS
        </h1>

        <div ref={bodyTextRef} className="space-y-8 text-white font-black text-xl md:text-2xl lg:text-3xl leading-relaxed tracking-wide" style={{ textAlign: 'justify', fontWeight: 900, letterSpacing: '0.05em', width: '100%', boxSizing: 'border-box', margin: 0 }}>
        <p>
          I am grateful for the ability to be able to share my work with people. I want to be able to give people better opportunities and create systems that can benefit anyone willing to participate.
        </p>

        <p>
          THE LOST+UNFOUNDS is a creative agency, a tech company, and mindset builder all rolled into one. The purpose of building this site is to get people to believe in themselves again. To believe in that random idea they came up with 15 years ago, start a new business, take that risk, and bet it all on themselves.
        </p>

        <p>
          We aim to lessen that risk by being a place where you can see an example of how to keep going and understand that whatever it is you want is being brought to you. We will share what we know, and if we don't have an answer, we can at least try to help you find the answer.
        </p>

        <p>
          The only thing we are an expert at is being ourselves, and this whole business is about R&D, like the Luscious Fox for artists, solopreneurs, hobbyists, experimenters, tradesmen and women, gig workers, and big dreamers.
        </p>

        <p>
          We must get uncomfortable to learn how to adapt. And how uncomfortable we are willing to get is sometimes the only way to find answers. I know I'm killing it on the Batman references, but Bruce Wayne had to leave Gotham to become the Batman.
        </p>

        <p>
          The closer you grow into yourself, the less you are willing to give to the noise.
        </p>

        <p>
          The thing about media, comics, literature, movies, tv shows, etc., is that there's a whole bunch of things I've seen in movies or read in a book, as a kid, that didn't exist before and do exist now, and this is a testament to our creative nature. We got flying cars before we got GTA6. Let's keep making more stuff.
        </p>

        <p>
          The crazy thing is, learning about something unrelated to the thing you are learning for, that opens up the key to all those projects and ideas on the back burner. And I just want to share things that help people quit their jobs and go to work for themselves.
        </p>

        <p>
          It is the Age of Aquarius, and all around us is evidence that fully supports the designs of this stage. We are in the age of information, and information has been propelled by the onset of A.I. chat and coding agents. I'm not a "what about our jobs" kind of person; I'm a "I can make robots work for me now?" kind of person.
        </p>

        <p>
          "And I can teach them exactly how to do it, so it's the same every time?"
        </p>

        <p>
          And now we're here to reveal our findings from the frontier and beyond.
        </p>

        <p 
          ref={merchRef} 
          className="text-white font-black text-2xl md:text-3xl lg:text-4xl leading-relaxed tracking-wide" 
          style={{ 
            perspective: '1000px',
            textAlign: 'justify',
            fontWeight: 900,
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap'
          }}
        >
          Thank you for buying my{' '}
          <a
            key={animationKey}
            href="/shop"
            className={`inline-block text-white hover:text-green-500 transition-colors duration-200 ${
              animationKey > 0 ? 'animate-merch-pop' : ''
            }`}
            style={{
              transformStyle: 'preserve-3d',
              fontWeight: 900,
            }}
          >
            MERCH
          </a>
          ! It's my art. More to come.
        </p>
        </div>
      </div>

      <style>{`
        h1 {
          max-width: 100%;
        }

        @keyframes merch-pop {
          0% {
            transform: translateZ(0) scale(1) rotateX(0deg);
            opacity: 1;
            filter: brightness(1);
          }
          5% {
            transform: translateZ(20px) scale(1.05) rotateX(5deg);
            opacity: 0.95;
            filter: brightness(1.1);
          }
          10% {
            transform: translateZ(60px) scale(1.2) rotateX(10deg);
            opacity: 0.85;
            filter: brightness(1.3);
          }
          15% {
            transform: translateZ(100px) scale(1.35) rotateX(15deg);
            opacity: 0.75;
            filter: brightness(1.5);
          }
          20% {
            transform: translateZ(120px) scale(1.4) rotateX(12deg);
            opacity: 0.7;
            filter: brightness(1.6);
          }
          25% {
            transform: translateZ(100px) scale(1.35) rotateX(8deg);
            opacity: 0.75;
            filter: brightness(1.4);
          }
          30% {
            transform: translateZ(80px) scale(1.25) rotateX(5deg);
            opacity: 0.8;
            filter: brightness(1.2);
          }
          35% {
            transform: translateZ(60px) scale(1.15) rotateX(3deg);
            opacity: 0.85;
            filter: brightness(1.1);
          }
          40% {
            transform: translateZ(40px) scale(1.1) rotateX(2deg);
            opacity: 0.9;
            filter: brightness(1.05);
          }
          45% {
            transform: translateZ(60px) scale(1.15) rotateX(4deg);
            opacity: 0.85;
            filter: brightness(1.15);
          }
          50% {
            transform: translateZ(40px) scale(1.1) rotateX(2deg);
            opacity: 0.9;
            filter: brightness(1.05);
          }
          55% {
            transform: translateZ(30px) scale(1.08) rotateX(1deg);
            opacity: 0.92;
            filter: brightness(1.02);
          }
          60% {
            transform: translateZ(20px) scale(1.05) rotateX(0.5deg);
            opacity: 0.95;
            filter: brightness(1.01);
          }
          65% {
            transform: translateZ(15px) scale(1.03) rotateX(0deg);
            opacity: 0.97;
            filter: brightness(1);
          }
          70% {
            transform: translateZ(10px) scale(1.02) rotateX(0deg);
            opacity: 0.98;
            filter: brightness(1);
          }
          80% {
            transform: translateZ(5px) scale(1.01) rotateX(0deg);
            opacity: 0.99;
            filter: brightness(1);
          }
          90% {
            transform: translateZ(2px) scale(1.005) rotateX(0deg);
            opacity: 0.995;
            filter: brightness(1);
          }
          100% {
            transform: translateZ(0) scale(1) rotateX(0deg);
            opacity: 1;
            filter: brightness(1);
          }
        }

        .animate-merch-pop {
          animation: merch-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}


