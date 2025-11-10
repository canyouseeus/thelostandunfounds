// Theme Toggle and Menu
const themeToggle = document.getElementById('themeToggle');
const menuToggle = document.getElementById('menuToggle');
const menuDropdown = document.getElementById('menuDropdown');
const menuLoginBtn = document.getElementById('menuLoginBtn');
const menuLogoutBtn = document.getElementById('menuLogoutBtn');
const body = document.body;

// Load saved theme or default to dark
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    if (themeToggle && themeToggle.querySelector('.theme-icon')) {
        themeToggle.querySelector('.theme-icon').textContent = '☾';
    }
} else {
    body.classList.remove('dark-mode');
    if (themeToggle && themeToggle.querySelector('.theme-icon')) {
        themeToggle.querySelector('.theme-icon').textContent = '☀';
    }
}

// Menu toggle functionality
if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('open');
        menuDropdown.classList.toggle('hidden');
        const isOpen = menuDropdown.classList.contains('open');
        menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (menuDropdown && !menuDropdown.contains(e.target) && !menuToggle.contains(e.target)) {
        menuDropdown.classList.remove('open');
        menuDropdown.classList.add('hidden');
        menuToggle.setAttribute('aria-expanded', 'false');
    }
});

// Theme toggle functionality
if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        themeToggle.querySelector('.theme-icon').textContent = isDark ? '☾' : '☀';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// Menu login button
if (menuLoginBtn) {
    menuLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        menuDropdown.classList.add('hidden');
        menuDropdown.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        showAuthModal();
    });
}

// Menu logout button
if (menuLogoutBtn) {
    menuLogoutBtn.addEventListener('click', async () => {
        menuDropdown.classList.add('hidden');
        menuToggle.setAttribute('aria-expanded', 'false');
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                currentUser = null;
                await checkAuthStatus();
                showStatus('LOGGED OUT', 'info');
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Still update UI even if logout request fails
            currentUser = null;
            await checkAuthStatus();
        }
    });
}

// Download functionality
const downloadBtn = document.getElementById('downloadBtn');
const tiktokUrlInput = document.getElementById('tiktokUrl');
const statusDiv = document.getElementById('status');
const resultDiv = document.getElementById('result');
const videoPreview = document.getElementById('videoPreview');
const downloadLink = document.getElementById('downloadLink');
const shareBtn = document.getElementById('shareBtn');
const transcriptionOverlay = document.getElementById('transcriptionOverlay');
const transcriptionText = document.getElementById('transcriptionText');
const toggleTranscriptionBtn = document.getElementById('toggleTranscription');
const followOverlay = document.getElementById('followOverlay');
const followText = document.getElementById('followText');

let currentTranscription = '';
let transcriptionVisible = false;
let currentVideoUrl = '';
let currentVideoTitle = '';
let currentUsername = '';
let driveAuthenticated = false;

// Google Drive elements
const driveAuthBtn = document.getElementById('driveAuthBtn');
const driveStatusText = document.getElementById('driveStatusText');
const uploadDriveBtn = document.getElementById('uploadDriveBtn');

function showStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');
}

function hideStatus() {
    statusDiv.classList.add('hidden');
}

function updateOverlayWidths() {
    const video = videoPreview;
    if (video.videoWidth && video.videoWidth > 0) {
        const videoWidth = video.offsetWidth || video.videoWidth;
        transcriptionOverlay.style.width = `${videoWidth}px`;
        followOverlay.style.width = `${videoWidth}px`;
    } else {
        // Wait for video to load
        video.addEventListener('loadedmetadata', () => {
            const videoWidth = video.offsetWidth;
            transcriptionOverlay.style.width = `${videoWidth}px`;
            followOverlay.style.width = `${videoWidth}px`;
        }, { once: true });
    }
}

async function showResult(videoUrl, transcription = '', title = '', username = '') {
    hideStatus();
    videoPreview.src = videoUrl;
    currentVideoUrl = videoUrl;
    currentVideoTitle = title || 'TikTok Video';
    currentUsername = username || '';
    currentTranscription = transcription || '';
    transcriptionVisible = false;
    transcriptionOverlay.classList.add('hidden');
    
    console.log('Transcription received:', currentTranscription ? currentTranscription.substring(0, 100) : 'EMPTY');
    console.log('Username:', currentUsername);
    
    // Update follow overlay with username
    if (currentUsername) {
        followText.textContent = `FOLLOW @${currentUsername.toUpperCase()}`;
        followOverlay.classList.remove('hidden');
    } else {
        followOverlay.classList.add('hidden');
    }
    
    if (currentTranscription && currentTranscription.trim().length > 0) {
        transcriptionText.textContent = currentTranscription;
        toggleTranscriptionBtn.style.display = 'inline-block';
        toggleTranscriptionBtn.textContent = 'TOGGLE TRANSCRIPTION';
    } else {
        toggleTranscriptionBtn.style.display = 'none';
    }
    
    // Set up download link for manual download
    downloadLink.href = videoUrl;
    downloadLink.download = '';
    
    // Update overlay widths when video loads
    videoPreview.addEventListener('loadedmetadata', updateOverlayWidths, { once: true });
    videoPreview.addEventListener('resize', updateOverlayWidths);
    
    // Show upload button if MCP is available
    uploadDriveBtn.classList.remove('hidden');
    
    // Show share button on mobile
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobileDevice && navigator.share) {
        shareBtn.classList.remove('hidden');
    } else {
        shareBtn.classList.add('hidden');
    }
    
    resultDiv.classList.remove('hidden');
}

function toggleTranscription() {
    if (!currentTranscription) return;
    
    transcriptionVisible = !transcriptionVisible;
    
    if (transcriptionVisible) {
        transcriptionOverlay.classList.remove('hidden');
        toggleTranscriptionBtn.textContent = 'HIDE TRANSCRIPTION';
    } else {
        transcriptionOverlay.classList.add('hidden');
        toggleTranscriptionBtn.textContent = 'TOGGLE TRANSCRIPTION';
    }
}

// API base URL - proxy through Vercel API routes to Railway backend
// Note: API_BASE_URL already includes /api/tiktok, so don't add /api/ to paths
const API_BASE_URL = window.location.origin + '/api/tiktok';

// Initialize Supabase client for Google OAuth
let supabaseClient = null;
function initSupabase() {
    if (typeof supabase !== 'undefined' && !supabaseClient) {
        // Get from window config or use placeholder - this should be set at build time
        const SUPABASE_URL = window.SUPABASE_URL || '';
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
        
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error('Supabase credentials not configured. Please set window.SUPABASE_URL and window.SUPABASE_ANON_KEY');
            return null;
        }
        
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            }
        });
    }
    return supabaseClient;
}

// PayPal environment (sandbox or live) - fetched from server
let PAYPAL_ENVIRONMENT = 'live'; // Default to live, will be updated from server
let PAYPAL_CLIENT_ID = null; // Will be fetched from server

// Load PayPal SDK dynamically based on environment
async function loadPayPalSDK() {
    try {
        const response = await fetch(`${API_BASE_URL}/payments/paypal-config`, {
            credentials: 'include'
        });
        const config = await response.json();
        
        PAYPAL_ENVIRONMENT = config.environment || 'live';
        PAYPAL_CLIENT_ID = config.clientId;
        
        if (!PAYPAL_CLIENT_ID) {
            // PayPal not configured - this is normal, don't log as error
            return;
        }
        
        // Remove existing PayPal SDK script if any
        const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
        if (existingScript) {
            existingScript.remove();
        }
        
        // Load PayPal SDK with the correct client ID
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&enable-funding=applepay`;
        script.async = true;
        script.onload = () => {
            console.log(`PayPal SDK loaded (${PAYPAL_ENVIRONMENT} environment)`);
            // Initialize PayPal buttons after SDK loads if user is logged in
            if (typeof paypal !== 'undefined' && currentUser) {
                initializePayPalButtons();
            }
        };
        script.onerror = () => {
            console.error('Failed to load PayPal SDK');
        };
        
        document.head.appendChild(script);
    } catch (error) {
        console.error('Failed to load PayPal config:', error);
        // Fallback to hardcoded client ID if config fetch fails
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://www.paypal.com/sdk/js?client-id=Aam9YOeO_c27VHZkkfVWsAGPnUDdzjuOjNDmVVNtTT14v8K1TIFCQytvKGQ-6Dvx-rv52pO3S7hWXtrp&currency=USD&enable-funding=applepay';
        fallbackScript.async = true;
        fallbackScript.onload = () => {
            if (typeof paypal !== 'undefined' && currentUser) {
                initializePayPalButtons();
            }
        };
        document.head.appendChild(fallbackScript);
    }
}

// Load PayPal SDK when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPayPalSDK);
} else {
    loadPayPalSDK();
}

// Auth elements
const authModal = document.getElementById('authModal');
const modalTitle = document.getElementById('modalTitle');
const closeModal = document.getElementById('closeModal');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authError = document.getElementById('authError');
const googleSignInBtn = document.getElementById('googleSignInBtn');

// User status elements
const userStatus = document.getElementById('userStatus');
const userEmail = document.getElementById('userEmail');
const userTier = document.getElementById('userTier');
const userDownloads = document.getElementById('userDownloads');

let isLoginMode = true;
let currentUser = null;

// Function to show auth modal
function showAuthModal() {
    isLoginMode = true;
    modalTitle.textContent = 'LOGIN / SIGN UP';
    authSubmitBtn.textContent = 'LOGIN / SIGN UP';
    authError.classList.add('hidden');
    authEmail.value = '';
    authPassword.value = '';
    authModal.classList.remove('hidden');
    setTimeout(() => authEmail.focus(), 100);
}

// Auth state management
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: 'include',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        const data = await response.json();
        
        if (data.authenticated && data.user) {
            currentUser = data.user;
            console.log('User authenticated:', data.user.email, 'Tier:', data.user.tier || 'free');
            updateAuthUI(data.user);
        } else {
            currentUser = null;
            // User not logged in - this is normal, don't log
            updateAuthUI(null);
        }
    } catch (error) {
        console.error('Failed to check auth status:', error);
        currentUser = null;
        updateAuthUI(null);
    }
}

function updateAuthUI(user) {
    if (user) {
        // User is logged in - check tier and update UI
        isPremium = (user.tier === 'premium' || user.tier === 'pro');
        
        // Update user status display
        if (userStatus) {
            userStatus.classList.remove('hidden');
            if (userEmail) {
                userEmail.textContent = user.email;
            }
            
            // Set tier display with badge
            const tierDisplay = user.tier ? user.tier.toUpperCase() : 'FREE';
            if (userTier) {
                userTier.textContent = tierDisplay;
                userTier.className = 'user-tier';
                if (isPremium) {
                    userTier.classList.add('premium-badge');
                } else {
                    userTier.classList.add('free-badge');
                }
            }
            
            // Update downloads display
            if (userDownloads) {
                userDownloads.textContent = 'Loading...';
            }
        }
        
        // Update menu buttons
        if (menuLoginBtn) menuLoginBtn.classList.add('hidden');
        if (menuLogoutBtn) menuLogoutBtn.classList.remove('hidden');
        
        // Update download limit display
        updateDownloadLimitDisplay();
        
        // Update upgrade banner (will show for free tier users)
        updateUpgradeBanner();
        
        // Fetch and display download count
        updateUserDownloadCount();
    } else {
        // Update menu buttons
        if (menuLoginBtn) menuLoginBtn.classList.remove('hidden');
        if (menuLogoutBtn) menuLogoutBtn.classList.add('hidden');
        
        // User is logged out - hide payment buttons and user status
        isPremium = false;
        if (userStatus) userStatus.classList.add('hidden');
        upgradeBanner.classList.add('hidden');
        hidePaymentButtons();
        updateDownloadLimitDisplay();
    }
}

async function updateUserDownloadCount() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/download/status`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.downloadCount !== undefined) {
            currentDownloadCount = data.downloadCount;
            currentDownloadLimit = data.downloadLimit || (isPremium ? 100 : 5);
            
            // Update user downloads display
            if (isPremium) {
                userDownloads.textContent = `${currentDownloadCount}/${currentDownloadLimit} downloads`;
                userDownloads.classList.add('premium-downloads');
            } else {
                userDownloads.textContent = `${currentDownloadCount}/${currentDownloadLimit} downloads`;
                userDownloads.classList.remove('premium-downloads');
            }
            
            updateDownloadLimitDisplay();
        }
    } catch (error) {
        console.error('Failed to fetch download count:', error);
    }
}

// Auth modal handlers - modal shows automatically when needed

closeModal.addEventListener('click', () => {
    authModal.classList.add('hidden');
    authError.classList.add('hidden');
    authEmail.value = '';
    authPassword.value = '';
});

// Close modal when clicking outside
authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.classList.add('hidden');
        authError.classList.add('hidden');
        authEmail.value = '';
        authPassword.value = '';
    }
});

authSubmitBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent form submission
    const email = authEmail.value.trim();
    const password = authPassword.value;
    
    console.log('Login button clicked:', { email, passwordLength: password.length });
    
    if (!email || !password) {
        showAuthError('EMAIL AND PASSWORD REQUIRED');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('PASSWORD MUST BE AT LEAST 6 CHARACTERS');
        return;
    }
    
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = 'PROCESSING...';
    
    try {
        // Always use login endpoint - it will auto-create account if email doesn't exist
        const endpoint = '/auth/login';
        const url = `${API_BASE_URL}${endpoint}`;
        console.log('Sending login request to:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            cache: 'no-store',
            body: JSON.stringify({ email, password }),
        });
        
        console.log('Login response status:', response.status);
        console.log('Login response headers:', Object.fromEntries(response.headers.entries()));
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
                console.log('Login response data:', data);
            } catch (jsonError) {
                console.error('Failed to parse JSON response:', jsonError);
                const text = await response.text();
                console.error('Response text:', text);
                showAuthError(`SERVER ERROR (${response.status}): ${text.substring(0, 100)}`);
                return;
            }
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            showAuthError(`SERVER ERROR (${response.status}): Expected JSON but got ${contentType || 'unknown'}`);
            return;
        }
        
        if (!response.ok) {
            // Show more helpful error messages
            const errorMsg = data?.error || data?.message || `HTTP ${response.status}: Authentication failed`;
            if (response.status === 401) {
                // Account exists but password is wrong
                showAuthError('ACCOUNT EXISTS - PASSWORD INCORRECT. USE CORRECT PASSWORD OR DIFFERENT EMAIL.');
            } else if (response.status === 500) {
                showAuthError('SERVER ERROR - PLEASE TRY AGAIN LATER');
            } else {
                showAuthError(errorMsg.toUpperCase());
            }
            return;
        }
        
        // Success - close modal and update UI
        console.log('Login successful, updating UI');
        
        // Clear form fields
        authEmail.value = '';
        authPassword.value = '';
        authError.classList.add('hidden');
        
        // Close modal immediately
        authModal.classList.add('hidden');
        
        // Update auth status
        await checkAuthStatus();
        
        // Show success message with user info
        const userEmail = data.user?.email || '';
        const userTier = data.user?.tier || 'free';
        const tierDisplay = userTier.toUpperCase();
        const message = `LOGGED IN: ${userEmail} | PLAN: ${tierDisplay}`;
        showStatus(message, 'success');
        
        // If user was trying to download, retry download
        if (pendingDownloadUrl) {
            const url = pendingDownloadUrl;
            pendingDownloadUrl = null;
            setTimeout(() => {
                tiktokUrlInput.value = url;
                downloadVideo();
            }, 500);
        }
    } catch (error) {
        console.error('Auth error:', error);
        showAuthError('NETWORK ERROR - TRY AGAIN');
    } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = 'LOGIN / SIGN UP';
    }
});

// Helper function to show auth errors
function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
}

// Google Sign In handler
googleSignInBtn.addEventListener('click', async () => {
  try {
    showStatus('REDIRECTING TO GOOGLE...', 'info');
    authError.classList.add('hidden');
    
    // Initialize Supabase if not already initialized
    const supabase = initSupabase();
    if (!supabase) {
      throw new Error('Supabase client not available. Please refresh the page.');
    }
    
    // Get the redirect URL - use the current page URL for callback
    // Since we're in an iframe, we need to redirect the parent window
    const redirectTo = `${window.location.origin}/auth/callback`;
    
    // Use Supabase OAuth directly (same as homepage)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (data.url) {
      // Redirect to Google OAuth
      // If in iframe, redirect parent window
      if (window.self !== window.top) {
        window.top.location.href = data.url;
      } else {
        window.location.href = data.url;
      }
    } else {
      throw new Error('Failed to get Google OAuth URL');
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    showAuthError('GOOGLE SIGN-IN FAILED: ' + error.message.toUpperCase());
    hideStatus();
  }
});

// Allow Enter key to submit auth form
authPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        authSubmitBtn.click();
    }
});

authEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        authPassword.focus();
    }
});

// Also handle form submit event
const authForm = document.getElementById('authForm');
if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Form submit event triggered');
        authSubmitBtn.click();
    });
} else {
    console.warn('Auth form not found - make sure HTML has id="authForm"');
}

// Check auth status on page load
checkAuthStatus();

// Upgrade CTA elements
const upgradeBanner = document.getElementById('upgradeBanner');
const upgradeBtn = document.getElementById('upgradeBtn');
const applePayButton = document.getElementById('applePayButton');
const googlePayButton = document.getElementById('googlePayButton');
const downloadLimit = document.getElementById('downloadLimit');
const downloadCount = document.getElementById('downloadCount');

let currentDownloadCount = 0;
let currentDownloadLimit = 5;
let paypalButtons = null;
let googlePayClient = null;
let currentPaymentAmount = 4.99;
let currentPaymentPlan = 'premium';
let isPremium = false;

function updateDownloadLimitDisplay() {
    if (isPremium) {
        downloadLimit.classList.add('hidden');
    } else {
        downloadLimit.classList.remove('hidden');
        downloadCount.textContent = currentDownloadCount;
        
        if (currentDownloadCount >= currentDownloadLimit) {
            downloadLimit.classList.add('warning');
        } else {
            downloadLimit.classList.remove('warning');
        }
    }
}

function updateUpgradeBanner() {
    // Show upgrade banner if:
    // 1. User is logged in AND on free tier AND (has reached limit OR we want to always show it)
    // 2. Always show for free tier users to encourage upgrades
    if (currentUser && !isPremium) {
        // Show upgrade banner for free tier users
        upgradeBanner.classList.remove('hidden');
        initializePaymentButtons();
    } else if (isPremium && currentUser) {
        // Hide for premium users
        upgradeBanner.classList.add('hidden');
        hidePaymentButtons();
    } else {
        // Hide if not logged in
        upgradeBanner.classList.add('hidden');
        hidePaymentButtons();
    }
}

// Initialize Apple Pay and Google Pay buttons
function initializePaymentButtons() {
    // Only show if user is logged in
    if (!currentUser) {
        hidePaymentButtons();
        return;
    }
    
    // Initialize PayPal SDK buttons (includes Apple Pay)
    if (typeof paypal !== 'undefined') {
        initializePayPalButtons();
    } else {
        console.warn('PayPal SDK not loaded yet, will initialize when SDK loads');
        // PayPal SDK will initialize buttons when it loads (see loadPayPalSDK function)
    }
    
    // Load Google Pay SDK dynamically only when needed
    if (!upgradeBanner.classList.contains('hidden') && currentUser) {
        loadGooglePaySDK();
    } else {
        googlePayButton.classList.add('hidden');
    }
}

function hidePaymentButtons() {
    applePayButton.classList.add('hidden');
    applePayButton.classList.remove('visible');
    googlePayButton.classList.add('hidden');
    googlePayButton.classList.remove('visible');
}

// Initialize PayPal Buttons (includes Apple Pay support)
function initializePayPalButtons() {
    if (paypalButtons) {
        paypalButtons.close();
    }
    
    const container = document.createElement('div');
    container.id = 'paypal-button-container';
    applePayButton.innerHTML = '';
    applePayButton.appendChild(container);
    
    paypalButtons = paypal.Buttons({
        style: {
            layout: 'vertical',
            color: body.classList.contains('dark-mode') ? 'white' : 'black',
            shape: 'rect',
            label: 'paypal'
        },
        fundingSource: paypal.FUNDING.APPLEPAY,
        createOrder: async (data, actions) => {
            try {
                showStatus('CREATING PAYMENT...', 'info');
                const response = await fetch(`${API_BASE_URL}/payments/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        plan: currentPaymentPlan,
                        billingCycle: 'monthly'
                    }),
                });
                
                const paymentData = await response.json();
                
                if (!response.ok) {
                    throw new Error(paymentData.error || 'Failed to create payment');
                }
                
                if (paymentData.requiresSetup) {
                    showStatus('PAYPAL NOT CONFIGURED', 'error');
                    return null;
                }
                
                if (paymentData.orderId) {
                    return paymentData.orderId;
                } else {
                    throw new Error('No order ID returned');
                }
            } catch (error) {
                console.error('PayPal order creation error:', error);
                showStatus(`PAYMENT ERROR: ${error.message.toUpperCase()}`, 'error');
                return null;
            }
        },
        onApprove: async (data, actions) => {
            try {
                showStatus('PROCESSING PAYMENT...', 'info');
                
                // Capture the payment
                const response = await fetch(`${API_BASE_URL}/payments/execute`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        orderId: data.orderID
                    }),
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    showStatus('PAYMENT SUCCESSFUL - UPGRADED TO PREMIUM!', 'success');
                    // Refresh auth status to get updated tier
                    setTimeout(async () => {
                        await checkAuthStatus();
                        await checkDownloadStatus();
                        await updateUserDownloadCount();
                    }, 1000);
                } else {
                    throw new Error(result.error || 'Payment failed');
                }
            } catch (error) {
                console.error('Payment execution error:', error);
                showStatus(`PAYMENT ERROR: ${error.message.toUpperCase()}`, 'error');
            }
        },
        onError: (err) => {
            console.error('PayPal button error:', err);
            showStatus('PAYMENT ERROR - TRY AGAIN', 'error');
        },
        onCancel: () => {
            showStatus('PAYMENT CANCELLED', 'info');
        }
    });
    
    // Render PayPal buttons (includes Apple Pay if available)
    paypalButtons.render('#paypal-button-container').then(() => {
        applePayButton.classList.remove('hidden');
        applePayButton.classList.add('visible');
    }).catch(err => {
        console.error('PayPal button render error:', err);
        applePayButton.classList.add('hidden');
    });
}

// Load Google Pay SDK dynamically
function loadGooglePaySDK() {
    // Check if already loaded
    if (typeof google !== 'undefined' && google.payments && google.payments.api) {
        initializeGooglePay();
        return;
    }
    
    // Check if script is already being loaded
    if (document.querySelector('script[src*="pay.google.com"]')) {
        // Wait for it to load
        const checkGooglePay = setInterval(() => {
            if (typeof google !== 'undefined' && google.payments && google.payments.api) {
                clearInterval(checkGooglePay);
                initializeGooglePay();
            }
        }, 100);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkGooglePay), 10000);
        return;
    }
    
    // Load Google Pay SDK only when needed
    const script = document.createElement('script');
    script.src = 'https://pay.google.com/gp/p/js/pay.js';
    script.async = true;
    script.onload = () => {
        // Wait a bit for SDK to fully initialize
        setTimeout(() => {
            if (typeof google !== 'undefined' && google.payments && google.payments.api) {
                initializeGooglePay();
            } else {
                console.warn('Google Pay SDK loaded but API not available');
                googlePayButton.classList.add('hidden');
            }
        }, 500);
    };
    script.onerror = () => {
        console.warn('Failed to load Google Pay SDK');
        googlePayButton.classList.add('hidden');
    };
    document.head.appendChild(script);
}

// Initialize Google Pay
function initializeGooglePay() {
    // Check if Google Pay API is available
    if (typeof google === 'undefined' || !google.payments || !google.payments.api) {
        console.warn('Google Pay API not available');
        if (googlePayButton) googlePayButton.classList.add('hidden');
        return;
    }
    
    // Check if button container exists and is ready
    if (!googlePayButton) {
        console.warn('Google Pay button element not found');
        return;
    }
    
    // Don't initialize if user is not logged in or upgrade banner is hidden
    if (!currentUser || upgradeBanner.classList.contains('hidden')) {
        googlePayButton.classList.add('hidden');
        return;
    }
    
    try {
        // Get PayPal merchant ID and environment from server
        const getPayPalConfig = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/payments/paypal-config`, {
                    credentials: 'include'
                });
                const config = await response.json();
                // Update global PayPal environment
                if (config.environment) {
                    PAYPAL_ENVIRONMENT = config.environment;
                }
                return {
                    merchantId: config.merchantId || config.clientId || null,
                    environment: config.environment || 'live'
                };
            } catch (error) {
                console.warn('Could not fetch PayPal config:', error);
                return { merchantId: null, environment: 'live' };
            }
        };
        
        // Initialize Google Pay with merchant ID and environment
        getPayPalConfig().then(config => {
            if (!config.merchantId) {
                console.warn('PayPal merchant ID not available, skipping Google Pay');
                googlePayButton.classList.add('hidden');
                return;
            }
            
            // Use TEST environment for sandbox, PRODUCTION for live
            const googlePayEnvironment = config.environment === 'sandbox' ? 'TEST' : 'PRODUCTION';
            console.log(`Initializing Google Pay with ${googlePayEnvironment} environment (PayPal: ${config.environment})`);
            
            const paymentsClient = new google.payments.api.PaymentsClient({
                environment: googlePayEnvironment
            });
            
            const baseRequest = {
                apiVersion: 2,
                apiVersionMinor: 0
            };
            
            const allowedPaymentMethods = [{
                type: 'CARD',
                parameters: {
                    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                    allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA']
                },
                tokenizationSpecification: {
                    type: 'PAYMENT_GATEWAY',
                    parameters: {
                        gateway: 'paypal',
                        gatewayMerchantId: config.merchantId
                    }
                }
            }];
            
            const transactionInfo = {
                totalPriceStatus: 'FINAL',
                totalPriceLabel: 'Total',
                totalPrice: currentPaymentAmount.toFixed(2),
                currencyCode: 'USD',
                countryCode: 'US'
            };
            
            const merchantInfo = {
                merchantName: 'TikTok Downloader'
            };
            
            const paymentDataRequest = {
                ...baseRequest,
                allowedPaymentMethods: allowedPaymentMethods,
                transactionInfo: transactionInfo,
                merchantInfo: merchantInfo
            };
            
            paymentsClient.isReadyToPay(paymentDataRequest).then(response => {
                if (response && response.result) {
                    try {
                        const button = paymentsClient.createButton({
                            onClick: onGooglePaymentButtonClicked,
                            buttonColor: 'black',
                            buttonType: 'pay',
                            buttonSizeMode: 'fill'
                        });
                        
                        if (button && googlePayButton) {
                            googlePayButton.innerHTML = '';
                            googlePayButton.appendChild(button);
                            googlePayButton.classList.remove('hidden');
                            googlePayButton.classList.add('visible');
                        }
                    } catch (buttonError) {
                        console.warn('Google Pay button creation error:', buttonError);
                        googlePayButton.classList.add('hidden');
                    }
                } else {
                    googlePayButton.classList.add('hidden');
                }
            }).catch(err => {
                console.warn('Google Pay readiness check error:', err);
                googlePayButton.classList.add('hidden');
            });
            
            function onGooglePaymentButtonClicked() {
                paymentsClient.loadPaymentData(paymentDataRequest).then(paymentData => {
                    processGooglePayPayment(paymentData);
                }).catch(err => {
                    console.warn('Google Pay payment error:', err);
                    if (err.statusCode !== 'CANCELED') {
                        showStatus('GOOGLE PAY ERROR - TRY AGAIN', 'error');
                    }
                });
            }
            
            async function processGooglePayPayment(paymentData) {
                try {
                    showStatus('PROCESSING GOOGLE PAY...', 'info');
                    
                    // Create PayPal order first
                    const createResponse = await fetch(`${API_BASE_URL}/payments/create`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            plan: currentPaymentPlan,
                            billingCycle: 'monthly',
                            paymentMethod: 'googlepay'
                        }),
                    });
                    
                    const createData = await createResponse.json();
                    
                    if (!createResponse.ok) {
                        throw new Error(createData.error || 'Failed to create payment');
                    }
                    
                    // Execute payment with Google Pay token
                    const executeResponse = await fetch(`${API_BASE_URL}/payments/execute`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            orderId: createData.orderId,
                            paymentMethod: 'googlepay',
                            paymentToken: paymentData.paymentMethodData.tokenizationData.token
                        }),
                    });
                    
                    const executeData = await executeResponse.json();
                    
                    if (executeResponse.ok && executeData.success) {
                        showStatus('PAYMENT SUCCESSFUL - UPGRADED TO PREMIUM!', 'success');
                        setTimeout(async () => {
                            await checkAuthStatus();
                            await checkDownloadStatus();
                        }, 1000);
                    } else {
                        throw new Error(executeData.error || 'Payment failed');
                    }
                } catch (error) {
                    console.error('Google Pay processing error:', error);
                    showStatus(`PAYMENT ERROR: ${error.message.toUpperCase()}`, 'error');
                }
            }
        });
    } catch (error) {
        console.warn('Google Pay initialization error:', error);
        googlePayButton.classList.add('hidden');
    }
}

// Upgrade button handler
upgradeBtn.addEventListener('click', async () => {
    // Check if user is logged in
    if (!currentUser) {
        showStatus('PLEASE LOGIN TO UPGRADE', 'info');
        setTimeout(() => {
            showAuthModal();
        }, 1000);
        return;
    }
    
    try {
        showStatus('CREATING PAYMENT...', 'info');
        const response = await fetch(`${API_BASE_URL}/payments/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                plan: 'premium',
                billingCycle: 'monthly'
            }),
        });
        
        const data = await response.json();
        
        console.log('Payment creation response:', JSON.stringify(data, null, 2));
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create payment');
        }
        
        if (data.requiresSetup) {
            showStatus('PAYPAL NOT CONFIGURED - CHECK SERVER SETUP', 'error');
            return;
        }
        
        if (data.approvalUrl) {
            // Redirect to PayPal
            console.log('Redirecting to PayPal:', data.approvalUrl);
            window.location.href = data.approvalUrl;
        } else {
            console.error('No approval URL in response:', JSON.stringify(data, null, 2));
            showStatus(`PAYMENT ERROR: ${data.message || data.error || 'NO APPROVAL URL RETURNED'}`, 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showStatus(`PAYMENT ERROR: ${error.message.toUpperCase()}`, 'error');
    }
});

// Check download status on load
async function checkDownloadStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/download/status`, {
            credentials: 'include',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        const data = await response.json();
        currentDownloadCount = data.count || 0;
        currentDownloadLimit = data.limit || 5;
        isPremium = data.isPremium || false;
        
        updateDownloadLimitDisplay();
        updateUpgradeBanner();
        
        // Initialize payment buttons if banner is visible and user is logged in
        if (!upgradeBanner.classList.contains('hidden') && currentUser) {
            initializePaymentButtons();
        }
    } catch (error) {
        console.error('Failed to check download status:', error);
    }
}

let pendingDownloadUrl = null;

async function downloadVideo() {
    const url = tiktokUrlInput.value.trim();

    if (!url) {
        showStatus('PLEASE ENTER A TIKTOK URL', 'error');
        return;
    }

    if (!url.includes('tiktok.com')) {
        showStatus('INVALID TIKTOK URL', 'error');
        return;
    }
    
    // Ensure we have the latest auth status
    await checkAuthStatus();
    
    // Check if user is authenticated - prompt for free account on first use
    console.log('Current user:', currentUser);
    console.log('Auth check complete, currentUser is:', currentUser ? 'SET' : 'NULL');
    
    if (!currentUser) {
        // Prompt user to login/signup for free account
        console.log('User not authenticated, showing auth modal');
        showStatus('CREATE FREE ACCOUNT FOR 5 DOWNLOADS/DAY', 'info');
        pendingDownloadUrl = url;
        setTimeout(() => {
            showAuthModal();
        }, 500);
        return;
    }
    
    console.log('User authenticated, proceeding with download');
    
    // Still make the API call - server will also check authentication
    // This ensures server-side enforcement even if frontend check fails

    downloadBtn.disabled = true;
    downloadBtn.textContent = 'GETTING VIDEO...';
    showStatus('PROCESSING...', 'info');

    try {
        const response = await fetch(`${API_BASE_URL}/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle authentication required error
            if (response.status === 401 && data.requiresAuth) {
                console.log('Authentication required, showing modal');
                showStatus('CREATE FREE ACCOUNT FOR 5 DOWNLOADS/DAY', 'info');
                pendingDownloadUrl = url;
                setTimeout(() => {
                    showAuthModal();
                }, 500);
                return;
            }
            
            // Handle download limit error
            if (response.status === 429 || data.upgradeRequired) {
                showStatus('DOWNLOAD LIMIT REACHED - UPGRADE TO PREMIUM', 'error');
                upgradeBanner.classList.remove('hidden');
                return;
            }
            throw new Error(data.error || data.message || 'Failed to download video');
        }

        if (data.success && data.videoUrl) {
            const qualityLabel = data.quality === 'HD' ? ' (HD)' : '';
            showStatus(`VIDEO READY${qualityLabel}`, 'success');
            
            // Update download count
            if (data.downloadCount !== undefined) {
                currentDownloadCount = data.downloadCount;
                currentDownloadLimit = data.downloadLimit || 5;
                updateDownloadLimitDisplay();
                updateUpgradeBanner();
                updateUserDownloadCount(); // Update user status display
            }
            
            setTimeout(async () => {
                await showResult(data.videoUrl, data.transcription || data.title || '', data.title || '', data.username || '');
            }, 500);
        } else {
            throw new Error('No video URL found in response');
        }
    } catch (error) {
        // Only log unexpected errors, suppress expected API errors
        const isExpectedError = error.message.includes('limit') || 
                                error.message.includes('429') ||
                                error.message.includes('Could not extract') ||
                                error.message.includes('watermark-free');
        
        if (!isExpectedError) {
            console.error('Download error:', error);
        }
        
        // Handle download limit error
        if (error.message.includes('limit') || error.message.includes('429')) {
            showStatus('DOWNLOAD LIMIT REACHED - UPGRADE TO PREMIUM', 'error');
            upgradeBanner.classList.remove('hidden');
            
            // If not logged in, show auth modal
            if (!currentUser) {
                setTimeout(() => {
                    showStatus('CREATE AN ACCOUNT FOR BETTER LIMITS', 'info');
                    showAuthModal();
                }, 2000);
            }
        } else {
            // Show user-friendly error message
            const errorMsg = error.message.includes('Could not extract') 
                ? 'VIDEO UNAVAILABLE - TRY ANOTHER URL'
                : error.message.toUpperCase();
            showStatus(`ERROR: ${errorMsg}`, 'error');
        }
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'GET VIDEO';
    }
}

downloadBtn.addEventListener('click', downloadVideo);

// Download link handler - triggers actual download when clicked
downloadLink.addEventListener('click', async (e) => {
    if (!currentVideoUrl) {
        e.preventDefault();
        showStatus('NO VIDEO TO DOWNLOAD', 'error');
        return;
    }
    
    // For cross-origin videos, we need to fetch and create blob
    try {
        e.preventDefault();
        showStatus('DOWNLOADING VIDEO...', 'info');
        
        const response = await fetch(currentVideoUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const filename = currentUsername 
            ? `tiktok_${currentUsername}_${Date.now()}.mp4`
            : `tiktok_video_${Date.now()}.mp4`;
        
        // Create temporary download link
        const tempLink = document.createElement('a');
        tempLink.href = blobUrl;
        tempLink.download = filename;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        
        // Clean up blob URL
        setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
        }, 1000);
        
        showStatus('VIDEO DOWNLOADED', 'success');
    } catch (error) {
        // Only log unexpected errors
        if (!error.message.includes('Failed to fetch') && !error.message.includes('network')) {
            console.debug('Download link error:', error.message);
        }
        showStatus('DOWNLOAD FAILED - TRY AGAIN', 'error');
    }
});

tiktokUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        downloadVideo();
    }
});

// Allow paste from clipboard
tiktokUrlInput.addEventListener('paste', (e) => {
    setTimeout(() => {
        const pastedText = tiktokUrlInput.value.trim();
        if (pastedText.includes('tiktok.com')) {
            // Auto-trigger download after paste (optional)
            // downloadVideo();
        }
    }, 100);
});

// Toggle transcription overlay
toggleTranscriptionBtn.addEventListener('click', toggleTranscription);

// Google Drive functionality
async function checkDriveStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/drive/status`);
        const data = await response.json();
        driveAuthenticated = data.authenticated;
        
        if (driveAuthenticated) {
            driveStatusText.textContent = 'GOOGLE DRIVE: CONNECTED';
            driveAuthBtn.textContent = 'CONNECTED';
            driveAuthBtn.disabled = true;
            if (currentVideoUrl) {
                uploadDriveBtn.classList.remove('hidden');
            }
        } else {
            driveStatusText.textContent = 'GOOGLE DRIVE: NOT CONNECTED';
            driveAuthBtn.textContent = 'CONNECT';
            driveAuthBtn.disabled = false;
            uploadDriveBtn.classList.add('hidden');
        }
    } catch (error) {
        console.error('Drive status check failed:', error);
        driveStatusText.textContent = 'GOOGLE DRIVE: ERROR';
    }
}

driveAuthBtn.addEventListener('click', () => {
    if (driveAuthenticated) {
        // Already connected
        return;
    }
    
    // Open auth window
    const authWindow = window.open(
        `${API_BASE_URL}/auth/google`,
        'Google Auth',
        'width=500,height=600'
    );
    
    // Check for auth completion
    const checkAuth = setInterval(async () => {
        if (authWindow.closed) {
            clearInterval(checkAuth);
            await checkDriveStatus();
        }
    }, 1000);
});

// Share button handler for mobile
shareBtn.addEventListener('click', async () => {
    if (!currentVideoUrl) {
        showStatus('NO VIDEO TO SHARE', 'error');
        return;
    }
    
    try {
        showStatus('LOADING VIDEO...', 'info');
        const response = await fetch(currentVideoUrl);
        const blob = await response.blob();
        
        const filename = currentUsername 
            ? `tiktok_${currentUsername}_${Date.now()}.mp4`
            : `tiktok_video_${Date.now()}.mp4`;
        
        const file = new File([blob], filename, { type: 'video/mp4' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: filename,
                text: 'TikTok Video'
            });
            showStatus('VIDEO SHARED - SAVE TO PHOTOS', 'success');
        } else {
            // Fallback: copy link or show instructions
            showStatus('USE DOWNLOAD BUTTON, THEN SHARE', 'info');
        }
    } catch (error) {
        console.error('Share error:', error);
        if (error.name !== 'AbortError') {
            showStatus('SHARE FAILED - USE DOWNLOAD BUTTON', 'error');
        }
    }
});

uploadDriveBtn.addEventListener('click', async () => {
    if (!currentVideoUrl) {
        showStatus('NO VIDEO TO UPLOAD', 'error');
        return;
    }
    
    if (!driveAuthenticated) {
        showStatus('NOT AUTHENTICATED - CLICK CONNECT', 'error');
        return;
    }
    
    uploadDriveBtn.disabled = true;
    uploadDriveBtn.textContent = 'UPLOADING...';
    showStatus('UPLOADING TO GOOGLE DRIVE...', 'info');
    
    try {
        const fileName = `${currentVideoTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.mp4`;
        
        const response = await fetch(`${API_BASE_URL}/drive/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoUrl: currentVideoUrl,
                fileName: fileName,
                username: currentUsername,
            }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            const folderInfo = data.accountFolder ? ` to ${data.accountFolder} folder` : '';
            showStatus(`UPLOADED TO GOOGLE DRIVE${folderInfo}`, 'success');
            uploadDriveBtn.textContent = 'VIEW IN DRIVE';
            uploadDriveBtn.onclick = () => window.open(data.webViewLink, '_blank');
            uploadDriveBtn.disabled = false;
        } else if (data.error === 'Not authenticated' && data.authUrl) {
            // Need to authenticate
            showStatus('AUTHENTICATION REQUIRED', 'error');
            driveAuthBtn.click();
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showStatus(`UPLOAD ERROR: ${error.message.toUpperCase()}`, 'error');
        uploadDriveBtn.disabled = false;
        uploadDriveBtn.textContent = 'UPLOAD TO DRIVE';
    }
});

// Check drive status on load
checkDriveStatus();


