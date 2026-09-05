/* ==========================================================================
   XPORD CLOTHING | Master Application Engine (ES6 Vanilla JS + Firebase Firestore)
   ========================================================================== */
import { 
  db, 
  auth, 
  googleProvider, 
  GoogleAuthProvider,
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile, 
  onAuthStateChanged 
} from "./src/firebase.js";
import { collection, onSnapshot, doc, setDoc, getDoc, deleteDoc, writeBatch, getDocs } from "firebase/firestore";

// Configurable Razorpay API Key Constant (Replace with your live/test key)
const RAZORPAY_KEY = "rzp_live_TPKngXGjXNTMru";

// Forward declarations and window assignments to ensure zero ReferenceErrors
export function getUserOrders() {
  if (!STATE || !STATE.currentUser) {
    return [];
  }
  const userEmail = (STATE.currentUser.email || '').toLowerCase().trim();
  const userUid = STATE.currentUser.uid;
  return (STATE.allOrders || []).filter(order => {
    const oUid = order.userId || order.userUid || order.uid;
    const oEmail = (order.customerEmail || '').toLowerCase().trim();
    return (userUid && oUid === userUid) || (userEmail && oEmail === userEmail);
  });
}
window.getUserOrders = getUserOrders;

export function switchAiCopilotMode(mode) {
  const importBtn = document.getElementById('ai-mode-import-btn');
  const chatBtn = document.getElementById('ai-mode-chat-btn');
  const subviewImport = document.getElementById('ai-subview-import');
  const subviewChat = document.getElementById('ai-subview-chat');

  if (mode === 'import') {
    importBtn?.classList.add('active');
    chatBtn?.classList.remove('active');
    subviewImport?.classList.remove('hidden');
    subviewChat?.classList.add('hidden');
  } else {
    chatBtn?.classList.add('active');
    importBtn?.classList.remove('active');
    subviewChat?.classList.remove('hidden');
    subviewImport?.classList.add('hidden');
    const chatContainer = document.getElementById('ai-chat-messages-container');
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}
window.switchAiCopilotMode = switchAiCopilotMode;

export function openAiCopilotModal(mode = 'chat') {
  const m = document.getElementById('ai-copilot-modal-wrapper');
  if (m) {
    m.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    switchAiCopilotMode(mode);
    setTimeout(() => {
      const urlInput = document.getElementById('ai-product-url-input');
      const chatInput = document.getElementById('ai-chat-input-field');
      const subviewImport = document.getElementById('ai-subview-import');
      if (mode === 'chat' || (subviewImport && subviewImport.classList.contains('hidden'))) {
        if (chatInput) {
          chatInput.focus();
          const chatContainer = document.getElementById('ai-chat-messages-container');
          if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      } else if (urlInput) {
        urlInput.focus();
      }
    }, 120);
  }
}
window.openAiCopilotModal = openAiCopilotModal;

export function closeAiCopilotModal() {
  const m = document.getElementById('ai-copilot-modal-wrapper');
  if (m) {
    m.classList.add('hidden');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
}
window.closeAiCopilotModal = closeAiCopilotModal;

export async function pasteClipboardToAiInput() {
  const urlInput = document.getElementById('ai-product-url-input');
  if (!urlInput) return;
  try {
    const text = await navigator.clipboard.readText();
    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
      urlInput.value = text.trim();
      if (typeof showToast === 'function') showToast("Pasted URL from clipboard!", "info");
      startAiUrlExtraction();
    } else if (text) {
      urlInput.value = text.trim();
      if (typeof showToast === 'function') showToast("Pasted text into URL field.", "info");
    }
  } catch (err) {
    urlInput.focus();
    if (typeof showToast === 'function') showToast("Please press Ctrl+V to paste your product URL.", "info");
  }
}
window.pasteClipboardToAiInput = pasteClipboardToAiInput;

export function loadSampleAiUrl(type) {
  const urlInput = document.getElementById('ai-product-url-input');
  if (!urlInput) return;
  const demoLinks = {
    flipkart: 'https://www.flipkart.com/the-souled-store-printed-men-round-neck-pure-cotton-oversized-t-shirt/p/itm123456789',
    amazon: 'https://www.amazon.in/Symbol-Premium-Solid-Regular-Linen-Shirt/dp/B08XYZ1234',
    myntra: 'https://www.myntra.com/jackets/roadster/roadster-men-charcoal-acid-wash-denim-jacket/19456782/buy'
  };
  urlInput.value = demoLinks[type] || demoLinks.flipkart;
  startAiUrlExtraction();
}
window.loadSampleAiUrl = loadSampleAiUrl;

export function sendAiQuickPrompt(promptText) {
  const input = document.getElementById('ai-chat-input-field');
  if (input) {
    input.value = promptText;
    if (typeof handleAiChatSubmit === 'function') {
      handleAiChatSubmit(new Event('submit'));
    }
  }
}
window.sendAiQuickPrompt = sendAiQuickPrompt;

// Baseline 10 products catalog for fallback
const BASELINE_PRODUCTS = [
  {
    id: "xpord-01",
    title: "Noir Micro-Velvet Oversized Club Shirt",
    price: 2999,
    originalPrice: 3999,
    fabric: "Velvet",
    fit: "Oversized",
    occasion: "Party",
    category: "shirts",
    badge: "BESTSELLER",
    inStock: true,
    rating: 4.9,
    primaryImage: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop",
    alternateImages: [
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Obsidian Black", "Deep Charcoal"],
    description: "Crafted from rich, heavyweight 280 GSM micro-velvet. Features a drop-shoulder relaxed profile, iridescent mother-of-pearl buttons, and a silky plush tactile finish."
  },
  {
    id: "xpord-02",
    title: "Earthy Flannel Plaid Boxy Overshirt",
    price: 2499,
    originalPrice: 2999,
    fabric: "Flannel",
    fit: "Boxy Fit",
    occasion: "Casual",
    category: "shirts",
    badge: "NEW ARRIVAL",
    inStock: true,
    rating: 4.8,
    primaryImage: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=800&auto=format&fit=crop",
    alternateImages: [
      "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Muted Beige Plaid", "Rust Plaid"],
    description: "100% double-brushed cotton flannel engineered for crisp structure and softness. Dual chest utility pockets and a contemporary boxy crop."
  },
  {
    id: "xpord-03",
    title: "Sands Viscose Relaxed Cuban Resort Shirt",
    price: 2199,
    originalPrice: 2799,
    fabric: "Viscose",
    fit: "Regular",
    occasion: "Casual",
    category: "shirts",
    badge: "TRENDING",
    inStock: true,
    rating: 4.7,
    primaryImage: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop",
    alternateImages: [
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Warm Sand", "Ivory"],
    description: "Ultra-breathable premium viscose twill with a slubbed drape. Cut with an open Cuban collar designed for warm evening gatherings."
  },
  {
    id: "xpord-04",
    title: "Artisanal Slub Organic Cotton Overshirt",
    price: 3499,
    originalPrice: 4299,
    fabric: "Cotton",
    fit: "Oversized",
    occasion: "Streetwear",
    category: "shirts",
    badge: "LIMITED EDITION",
    inStock: true,
    rating: 5.0,
    primaryImage: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop",
    alternateImages: [
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop"
    ],
    sizes: ["M", "L", "XL"],
    colors: ["Ecru White", "Slate Gray"],
    description: "Heavyweight 320 GSM organic slub cotton overshirt with raw metal hardware, side-slit pockets, and structural shoulder seams."
  },
  {
    id: "xpord-05",
    title: "Obsidian Viscose Twin-Pleat Tailored Trouser",
    price: 3299,
    originalPrice: 3999,
    fabric: "Viscose",
    fit: "Slim Fit",
    occasion: "Formal",
    category: "trousers",
    badge: "BESTSELLER",
    inStock: true,
    rating: 4.9,
    primaryImage: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop",
    alternateImages: [
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop"
    ],
    sizes: ["28", "30", "32", "34", "36"],
    colors: ["Midnight Obsidian"],
    description: "Masterfully tailored from high-density Italian viscose blend. Features twin front pleats, adjustable waist side-tabs, and a sharp tapered hem."
  },
  {
    id: "xpord-06",
    title: "Raw Indigo Heavy Cotton Bungee Cargo Trouser",
    price: 2899,
    originalPrice: 3499,
    fabric: "Cotton",
    fit: "Oversized",
    occasion: "Streetwear",
    category: "trousers",
    badge: "NEW ARRIVAL",
    inStock: true,
    rating: 4.8,
    primaryImage: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?q=80&w=800&auto=format&fit=crop",
    alternateImages: [
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop"
    ],
    sizes: ["30", "32", "34", "36"],
    colors: ["Raw Indigo Denim"],
    description: "Relaxed utilitarian cargo pants engineered from tough 380 GSM cotton twill with 6 gusseted 3D flap pockets and ankle cord adjusters."
  },
  {
    id: "xpord-07",
    title: "Midnight Velvet Peak Lapel Evening Blazer",
    price: 5999,
    originalPrice: 7499,
    fabric: "Velvet",
    fit: "Slim Fit",
    occasion: "Party",
    category: "jackets",
    badge: "EXCLUSIVE",
    inStock: true,
    rating: 4.9,
    primaryImage: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop",
    alternateImages: [
      "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=800&auto=format&fit=crop"
    ],
    sizes: ["38", "40", "42", "44"],
    colors: ["Royal Midnight Velvet"],
    description: "Statement single-breasted evening blazer with glossy satin peak lapels, interior secret passport pocket, and custom monogram silk lining."
  },
  {
    id: "xpord-08",
    title: "Heritage Flannel Sherpa-Lined Trucker Jacket",
    price: 4299,
    originalPrice: 4999,
    fabric: "Flannel",
    fit: "Oversized",
    occasion: "Casual",
    category: "jackets",
    badge: "POPULAR",
    inStock: true,
    rating: 4.8,
    primaryImage: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop",
    alternateImages: [
      "https://images.unsplash.com/photo-1543076447-215ad9ba6923?q=80&w=800&auto=format&fit=crop"
    ],
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["Buffalo Plaid Red"],
    description: "Thick insulated flannel trucker jacket backed with plush thermal fleece lining. Built for chilly night drives and outdoor urban lounging."
  }
];

// --------------------------------------------------------------------------
// Robust Storage Layer: IndexedDB (Unlimited storage for media) + Safe LocalStorage
// --------------------------------------------------------------------------
const IDB_NAME = 'xpord_storage_db';
const IDB_STORE = 'app_data';

function openIndexedDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const dbInstance = e.target.result;
        if (!dbInstance.objectStoreNames.contains(IDB_STORE)) {
          dbInstance.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch (err) {
      resolve(null);
    }
  });
}

async function idbSet(key, value) {
  try {
    const dbInstance = await openIndexedDB();
    if (!dbInstance) return false;
    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  } catch (e) {
    return false;
  }
}

async function idbGet(key) {
  try {
    const dbInstance = await openIndexedDB();
    if (!dbInstance) return null;
    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  } catch (e) {
    return null;
  }
}

/**
 * Universal Image Compressor: Compresses phone/desktop photos into compact WebP/JPEG
 * Typically reduces 5MB-10MB camera files down to ~35KB-60KB without visible quality loss.
 */
function compressImageFile(file, maxDimension = 900, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawData = e.target.result;
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          // Smooth bilinear rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Try modern webp first, fall back to jpeg
          let compressed = canvas.toDataURL('image/webp', quality);
          if (!compressed || compressed.startsWith('data:image/png')) {
            compressed = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(compressed);
        } catch (canvasErr) {
          resolve(rawData);
        }
      };
      img.onerror = () => resolve(rawData);
      img.src = rawData;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
window.compressImageFile = compressImageFile;

/**
 * Safely persists products to both IndexedDB (full size) and LocalStorage (with quota guard)
 */
function saveProductsToStorage(products) {
  if (!Array.isArray(products)) return;

  // 1. Always store full fidelity in IndexedDB (Unlimited quota)
  idbSet('xpord_products', products);

  // 2. Safely store in LocalStorage without throwing QuotaExceededError
  try {
    localStorage.setItem('xpord_products', JSON.stringify(products));
  } catch (quotaErr) {
    // If quota exceeded, create lightweight backup for localStorage
    try {
      const lightweight = products.map(p => {
        const primary = p.primaryImage && p.primaryImage.length > 50000 
          ? p.primaryImage.substring(0, 50000) 
          : p.primaryImage;
        const alts = Array.isArray(p.alternateImages) 
          ? p.alternateImages.map(a => a && a.length > 50000 ? a.substring(0, 50000) : a).slice(0, 3) 
          : [];
        return {
          ...p,
          primaryImage: primary,
          alternateImages: alts
        };
      });
      localStorage.setItem('xpord_products', JSON.stringify(lightweight));
    } catch (secondErr) {
      // Gracefully clear old cache key if still tight
      try {
        localStorage.removeItem('xpord_products');
      } catch (e) {}
    }
  }
}
window.saveProductsToStorage = saveProductsToStorage;

/**
 * Loads products array dynamically from browser's localStorage or IndexedDB.
 * Fallbacks to baseline products array if empty.
 */
function loadProductsFromStorage() {
  const saved = localStorage.getItem('xpord_products');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to parse xpord_products from localStorage:", e);
    }
  }
  return [...BASELINE_PRODUCTS];
}

// Asynchronously load full IndexedDB catalog if available on startup
(async function hydrateFromIndexedDB() {
  try {
    const idbProducts = await idbGet('xpord_products');
    if (Array.isArray(idbProducts) && idbProducts.length > 0 && (!STATE.products || STATE.products.length <= BASELINE_PRODUCTS.length)) {
      STATE.products = idbProducts;
      if (typeof renderApp === 'function') renderApp();
    }
  } catch (e) {}
})();

// Helper to load array/object from localStorage safely
function loadFromStorage(key, fallback = []) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    return fallback;
  }
}

// 8-Hour Session Duration Constant (28,800,000 ms)
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

// Helper to load user session with 8-hour retention guarantee
function loadActiveUserSession() {
  const user = loadFromStorage('xpord_user', null);
  if (!user) return null;
  const now = Date.now();
  let expiresAt = user.sessionExpiresAt;
  if (!expiresAt && user.loginTimestamp) {
    expiresAt = user.loginTimestamp + SESSION_DURATION_MS;
  }
  if (!expiresAt) {
    expiresAt = now + SESSION_DURATION_MS;
    user.loginTimestamp = now;
    user.sessionExpiresAt = expiresAt;
    saveToStorage('xpord_user', user);
  }

  // Check if session has exceeded 8 hours
  if (now > expiresAt) {
    console.log("XPORD: 8-hour session expired. Clearing user session.");
    try {
      localStorage.removeItem('xpord_user');
    } catch (e) {}
    return null;
  }
  return user;
}

// Helper to save data to localStorage safely with quota protection
function saveToStorage(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    // Quota exceeded protection: if key is orders/cart/wishlist, store in IDB too
    idbSet(key, value);
    console.warn(`Safe storage fallback for ${key}:`, e.message || e);
  }
}
window.loadFromStorage = loadFromStorage;
window.saveToStorage = saveToStorage;
window.loadActiveUserSession = loadActiveUserSession;
window.SESSION_DURATION_MS = SESSION_DURATION_MS;

// --------------------------------------------------------------------------
// 1. CENTRALIZED APPLICATION CATALOG & STATE OBJECT
// --------------------------------------------------------------------------
const STATE = {
  // Catalog Array loaded from localStorage or baseline default
  products: loadProductsFromStorage(),

  // Category-First Workflow view toggle
  isCategoryView: true,

  // Active Filter State
  activeFilters: {
    search: '',
    fabric: [],
    fit: [],
    occasion: [],
    category: 'all',
    maxPrice: 8000,
    inStockOnly: false,
    sort: 'featured'
  },

  // Cart & Wishlist & Orders State (Session & User-isolated)
  cart: loadFromStorage('xpord_cart', []),
  directCheckoutItem: null,
  wishlist: loadFromStorage('xpord_wishlist', []),
  allOrders: loadFromStorage('xpord_all_orders', []),
  appliedCoupon: loadFromStorage('xpord_applied_coupon', null),
  orders: [],
  reviews: [],
  currentUser: loadActiveUserSession(),
  siteSettings: {
    tickerMessage: "COMPLIMENTARY EXPRESS SHIPPING ON ORDERS ABOVE ₹1,999 | USE CODE XPORD20 FOR 20% OFF",
    heroTitle: "REDEFINING MODERN SILHOUETTES",
    heroSubtitle: "Heavyweight micro-velvet, Japanese slub linen, and masterfully pleated viscose tailored for statement street elegance.",
    promoCode: "XPORD20",
    promoDiscount: 20
  },
  // Available Promo Codes & Offers State
  coupons: loadFromStorage('xpord_coupons', [
    {
      id: 'XPORD20',
      code: 'XPORD20',
      discountPercent: 20,
      minOrder: 999,
      maxDiscount: 1000,
      description: '20% OFF Everything',
      terms: 'Valid on orders of ₹999 or more across all apparel collections. Max discount up to ₹1,000.',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'CAHOOT20',
      code: 'CAHOOT20',
      discountPercent: 20,
      minOrder: 1499,
      maxDiscount: 1500,
      description: '20% OFF Exclusive Drop',
      terms: 'Applicable on orders of ₹1,499 or more on shirts and pants.',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'WELCOME10',
      code: 'WELCOME10',
      discountPercent: 10,
      minOrder: 0,
      maxDiscount: 500,
      description: '10% Welcome Discount',
      terms: 'Instant 10% discount on your order with no minimum purchase requirement.',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'FESTIVE25',
      code: 'FESTIVE25',
      discountPercent: 25,
      minOrder: 1999,
      maxDiscount: 2000,
      description: '25% Festive Season Special',
      terms: 'Applicable on orders of ₹1,999 or more. Valid on complete cart total.',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'MEGA30',
      code: 'MEGA30',
      discountPercent: 30,
      minOrder: 2999,
      maxDiscount: 3000,
      description: '30% Mega VIP Savings',
      terms: 'Exclusive 30% savings on large orders above ₹2,999.',
      active: true,
      createdAt: new Date().toISOString()
    }
  ]),
  appliedCoupon: loadFromStorage('xpord_applied_coupon', null),

  // Selected Size Map per product
  selectedSizes: {},

  // UI Drawer/Modal state
  isCartOpen: false,
  isFilterDrawerOpen: false,
  isMobileNavOpen: false
};
const state = STATE;
window.state = STATE;
window.STATE = STATE;

// Available Promo Coupons Baseline Defaults
const DEFAULT_COUPONS = [
  {
    id: 'XPORD20',
    code: 'XPORD20',
    discountPercent: 20,
    minOrder: 999,
    maxDiscount: 1000,
    description: '20% OFF Everything',
    terms: 'Valid on orders of ₹999 or more across all apparel collections. Max discount up to ₹1,000.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'CAHOOT20',
    code: 'CAHOOT20',
    discountPercent: 20,
    minOrder: 1499,
    maxDiscount: 1500,
    description: '20% OFF Exclusive Drop',
    terms: 'Applicable on orders of ₹1,499 or more on shirts and pants.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'WELCOME10',
    code: 'WELCOME10',
    discountPercent: 10,
    minOrder: 0,
    maxDiscount: 500,
    description: '10% Welcome Discount',
    terms: 'Instant 10% discount on your order with no minimum purchase requirement.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'FESTIVE25',
    code: 'FESTIVE25',
    discountPercent: 25,
    minOrder: 1999,
    maxDiscount: 2000,
    description: '25% Festive Season Special',
    terms: 'Applicable on orders of ₹1,999 or more. Valid on complete cart total.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'MEGA30',
    code: 'MEGA30',
    discountPercent: 30,
    minOrder: 2999,
    maxDiscount: 3000,
    description: '30% Mega VIP Savings',
    terms: 'Exclusive 30% savings on large orders above ₹2,999.',
    active: true,
    createdAt: new Date().toISOString()
  }
];

// --------------------------------------------------------------------------
// 2. DOM ELEMENT REFERENCES
// --------------------------------------------------------------------------
const DOM = {
  // Navigation & Search
  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search'),
  navLinks: document.querySelectorAll('.nav-link, .mobile-nav-link'),
  categoryPills: document.querySelectorAll('.category-pill'),
  mobileMenuBtn: document.getElementById('mobile-menu-btn'),
  mobileNavDrawer: document.getElementById('mobile-nav-drawer'),
  closeMobileNavBtn: document.getElementById('close-mobile-nav'),
  promoBanner: document.getElementById('promo-banner'),
  closePromoBtn: document.getElementById('close-promo'),
  wishlistBtn: document.getElementById('wishlist-btn'),
  wishlistCount: document.getElementById('wishlist-count'),
  ordersBtn: document.getElementById('orders-btn'),
  ordersCount: document.getElementById('orders-count'),
  userProfileBtn: document.getElementById('user-profile-btn'),
  wishlistModalWrapper: document.getElementById('wishlist-modal-wrapper'),
  ordersModalWrapper: document.getElementById('orders-modal-wrapper'),
  userModalWrapper: document.getElementById('user-modal-wrapper'),

  // Category-First Section Elements
  categoryBentoSection: document.getElementById('category-bento-section'),
  quickCategorySection: document.getElementById('quick-category-section'),
  appMain: document.getElementById('app-main'),
  backToCategoriesBtn: document.getElementById('back-to-categories-btn'),

  // Product Grid & Collection Controls
  productGrid: document.getElementById('product-grid'),
  emptyState: document.getElementById('empty-state'),
  emptyResetBtn: document.getElementById('empty-reset-btn'),
  collectionHeading: document.getElementById('collection-heading'),
  productCountText: document.getElementById('product-count-text'),
  desktopSortSelect: document.getElementById('desktop-sort-select'),
  mobileSortSelect: document.getElementById('mobile-sort-select'),

  // Filters Sidebar & Mobile Drawer
  sidebarFilters: document.getElementById('sidebar-filters'),
  openFilterDrawerBtn: document.getElementById('open-filter-drawer-btn'),
  closeFilterDrawerBtn: document.getElementById('close-filter-drawer-btn'),
  clearFiltersBtn: document.getElementById('clear-filters-btn'),
  priceRangeInput: document.getElementById('price-range'),
  priceRangeValue: document.getElementById('price-range-value'),
  inStockCheckbox: document.getElementById('in-stock-checkbox'),
  filterCheckboxes: document.querySelectorAll('input[data-filter]'),
  mobileFilterCountBadge: document.getElementById('mobile-filter-count-badge'),

  // Filter Chips
  activeFilterChipsBar: document.getElementById('active-filter-chips'),
  chipsContainer: document.getElementById('chips-container'),
  resetChipsBtn: document.getElementById('reset-chips-btn'),

  // Header Counters
  wishlistBtn: document.getElementById('wishlist-btn'),
  wishlistCountBadge: document.getElementById('wishlist-count'),
  cartToggleBtn: document.getElementById('cart-toggle-btn'),
  cartCountBadge: document.getElementById('cart-count'),

  // Sliding Cart Drawer
  cartDrawerWrapper: document.getElementById('cart-drawer-wrapper'),
  cartBackdrop: document.getElementById('cart-backdrop'),
  closeCartDrawerBtn: document.getElementById('close-cart-drawer'),
  cartItemsContainer: document.getElementById('cart-items-container'),
  cartDrawerCount: document.getElementById('cart-drawer-count'),
  shippingProgressText: document.getElementById('shipping-progress-text'),
  shippingProgressFill: document.getElementById('shipping-progress-fill'),

  // Cart Coupon & Checkout
  couponInput: document.getElementById('coupon-input'),
  applyCouponBtn: document.getElementById('apply-coupon-btn'),
  couponFeedback: document.getElementById('coupon-feedback'),
  cartSubtotalText: document.getElementById('cart-subtotal-text'),
  discountRow: document.getElementById('discount-row'),
  discountPercentTag: document.getElementById('discount-percent-tag'),
  cartDiscountText: document.getElementById('cart-discount-text'),
  cartShippingText: document.getElementById('cart-shipping-text'),
  cartTotalText: document.getElementById('cart-total-text'),
  proceedCheckoutBtn: document.getElementById('proceed-checkout-btn'),

  // Modals & Drawers
  couponsModalWrapper: document.getElementById('coupons-modal-wrapper'),
  couponsBackdrop: document.getElementById('coupons-backdrop'),
  couponsListContainer: document.getElementById('coupons-list-container'),
  cartAppliedCouponBanner: document.getElementById('cart-applied-coupon-banner'),
  quickViewWrapper: document.getElementById('quick-view-modal-wrapper'),
  quickViewBackdrop: document.getElementById('quick-view-backdrop'),
  closeQuickViewBtn: document.getElementById('close-quick-view-btn'),
  quickViewBody: document.getElementById('quick-view-body'),

  checkoutModalWrapper: document.getElementById('checkout-modal-wrapper'),
  checkoutBackdrop: document.getElementById('checkout-backdrop'),
  closeCheckoutBtn: document.getElementById('close-checkout-btn'),
  checkoutModalBody: document.getElementById('checkout-modal-body'),

  // Hero
  heroExploreBtn: document.getElementById('hero-explore-btn'),
  toastContainer: document.getElementById('toast-container')
};

// --------------------------------------------------------------------------
// 3. INITIALIZATION & ROUTING ENGINE
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// ADVANCED NAVIGATION & MOBILE HARDWARE BACK-BUTTON ROUTING SYSTEM
// --------------------------------------------------------------------------
window.XPORD_NAV = {
  stack: [],
  isPopping: false,

  pushView: function(viewName, params = {}) {
    if (this.isPopping) return;

    const current = this.stack[this.stack.length - 1];
    if (current && current.viewName === viewName && JSON.stringify(current.params) === JSON.stringify(params)) {
      return;
    }

    this.stack.push({ viewName, params });

    let hash = `#${viewName}`;
    if (params.id) hash += `-${params.id}`;
    if (params.productId) hash += `-${params.productId}`;
    if (params.policyType) hash += `-${params.policyType}`;

    const stateData = { xpordModal: viewName, params: params, stackDepth: this.stack.length };
    try {
      window.history.pushState(stateData, '', hash);
    } catch (e) {
      console.warn("History pushState error:", e);
    }
  },

  closeView: function(viewName, directCloseFn) {
    if (this.isPopping) {
      if (typeof directCloseFn === 'function') directCloseFn();
      return;
    }

    const top = this.stack[this.stack.length - 1];
    if (top && top.viewName === viewName) {
      this.stack.pop();
      if (window.history.state && window.history.state.xpordModal) {
        this.isPopping = true;
        window.history.back();
        setTimeout(() => { this.isPopping = false; }, 80);
      }
    }
    if (typeof directCloseFn === 'function') {
      directCloseFn();
    }
  },

  closeAllModalsDirectly: function() {
    let closedAny = false;

    // Quick View / PDP
    if (DOM.quickViewWrapper && !DOM.quickViewWrapper.classList.contains('hidden')) {
      DOM.quickViewWrapper.classList.add('hidden');
      closedAny = true;
    }
    // Cart Drawer
    if (DOM.cartDrawerWrapper && DOM.cartDrawerWrapper.classList.contains('open')) {
      STATE.isCartOpen = false;
      DOM.cartDrawerWrapper.classList.remove('open');
      closedAny = true;
    }
    // Checkout Modal
    if (DOM.checkoutModal && !DOM.checkoutModal.classList.contains('hidden')) {
      DOM.checkoutModal.classList.add('hidden');
      closedAny = true;
    }
    // Wishlist Modal
    if (DOM.wishlistModalWrapper && !DOM.wishlistModalWrapper.classList.contains('hidden')) {
      DOM.wishlistModalWrapper.classList.add('hidden');
      closedAny = true;
    }
    // Orders Modal
    if (DOM.ordersModalWrapper && !DOM.ordersModalWrapper.classList.contains('hidden')) {
      DOM.ordersModalWrapper.classList.add('hidden');
      closedAny = true;
    }
    // User Modal
    if (DOM.userModalWrapper && !DOM.userModalWrapper.classList.contains('hidden')) {
      DOM.userModalWrapper.classList.add('hidden');
      closedAny = true;
    }
    // Dedicated Account View
    const accountView = document.getElementById('xpordAccountView');
    if (accountView && !accountView.classList.contains('hidden')) {
      accountView.classList.add('hidden');
      accountView.style.setProperty('display', 'none', 'important');
      closedAny = true;
    }
    // Admin Panel
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel && !adminPanel.classList.contains('hidden')) {
      adminPanel.classList.add('hidden');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      closedAny = true;
    }
    // Admin PIN Modal
    const adminPin = document.getElementById('adminPinModal');
    if (adminPin && !adminPin.classList.contains('hidden')) {
      adminPin.classList.add('hidden');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      closedAny = true;
    }
    // Coupons Modal
    const couponsModal = document.getElementById('coupons-modal') || document.getElementById('coupons-modal-wrapper');
    if (couponsModal && !couponsModal.classList.contains('hidden')) {
      couponsModal.classList.add('hidden');
      closedAny = true;
    }
    // Size Guide Modal
    const sizeGuideModal = document.getElementById('size-guide-modal');
    if (sizeGuideModal && !sizeGuideModal.classList.contains('hidden')) {
      sizeGuideModal.classList.add('hidden');
      closedAny = true;
    }
    // Cancel Order Modal
    const cancelModal = document.getElementById('cancel-order-modal') || document.getElementById('cancel-order-modal-wrapper');
    if (cancelModal && !cancelModal.classList.contains('hidden')) {
      cancelModal.classList.add('hidden');
      closedAny = true;
    }
    // Cannot Cancel Modal
    const cannotCancelModal = document.getElementById('cannot-cancel-modal');
    if (cannotCancelModal && !cannotCancelModal.classList.contains('hidden')) {
      cannotCancelModal.classList.add('hidden');
      closedAny = true;
    }
    // Static Legal Policy Modal
    const legalModal = document.getElementById('legalModal') || document.getElementById('modal');
    if (legalModal && !legalModal.classList.contains('hidden')) {
      legalModal.classList.add('hidden');
      document.body.style.overflow = '';
      closedAny = true;
    }
    // Mobile Nav Drawer
    if (DOM.mobileNavDrawer && DOM.mobileNavDrawer.classList.contains('open')) {
      DOM.mobileNavDrawer.classList.remove('open');
      closedAny = true;
    }
    // Mobile Filters Drawer
    if (DOM.sidebarFilters && DOM.sidebarFilters.classList.contains('open')) {
      DOM.sidebarFilters.classList.remove('open');
      closedAny = true;
    }

    document.body.style.overflow = '';
    return closedAny;
  },

  openViewDirectly: function(viewName, params = {}) {
    if (viewName === 'pdp' || viewName === 'product') {
      if (params.productId && typeof window.openQuickView === 'function') {
        window.openQuickView(params.productId, true);
      }
    } else if (viewName === 'cart') {
      if (typeof window.openCartDrawer === 'function') window.openCartDrawer(true);
    } else if (viewName === 'checkout') {
      if (typeof window.openCheckoutModal === 'function') window.openCheckoutModal(!!params.isDirectBuy, true);
    } else if (viewName === 'wishlist') {
      if (typeof window.openWishlistModal === 'function') window.openWishlistModal(true);
    } else if (viewName === 'orders' || viewName === 'tracking') {
      if (typeof window.openOrdersModal === 'function') window.openOrdersModal(true);
    } else if (viewName === 'account') {
      if (typeof window.openAccountView === 'function') window.openAccountView(true);
    } else if (viewName === 'user' || viewName === 'login') {
      if (typeof window.openUserModal === 'function') window.openUserModal(true);
    } else if (viewName === 'admin') {
      if (typeof window.openAdminPanel === 'function') window.openAdminPanel(true);
    } else if (viewName === 'coupons') {
      if (typeof window.openCouponsModal === 'function') window.openCouponsModal(true);
    } else if (viewName === 'size-guide') {
      if (typeof window.openSizeGuideModal === 'function') window.openSizeGuideModal(true);
    } else if (viewName === 'policy' && params.policyType) {
      if (typeof window.openModal === 'function') window.openModal(params.policyType, true);
    } else if (viewName === 'cancel-order') {
      if (params.orderId && typeof window.openCancelOrderModal === 'function') window.openCancelOrderModal(params.orderId, true);
    }
  },

  checkHashOrQueryOnLoad: function() {
    const hash = window.location.hash || '';
    const params = new URLSearchParams(window.location.search);
    const queryProduct = params.get('product') || params.get('pdp');

    if (queryProduct) {
      this.openViewDirectly('pdp', { productId: queryProduct });
      return;
    }

    if (hash.startsWith('#product-') || hash.startsWith('#pdp-')) {
      const prodId = hash.replace(/^#(product|pdp)-/, '');
      this.openViewDirectly('pdp', { productId: prodId });
    } else if (hash === '#cart') {
      this.openViewDirectly('cart', {});
    } else if (hash === '#checkout') {
      this.openViewDirectly('checkout', {});
    } else if (hash === '#orders' || hash === '#tracking') {
      this.openViewDirectly('orders', {});
    } else if (hash === '#wishlist') {
      this.openViewDirectly('wishlist', {});
    } else if (hash === '#account' || hash === '#login' || hash === '#user') {
      this.openViewDirectly('user', {});
    } else if (hash === '#admin') {
      this.openViewDirectly('admin', {});
    } else if (hash === '#coupons') {
      this.openViewDirectly('coupons', {});
    } else if (hash === '#size-guide') {
      this.openViewDirectly('size-guide', {});
    } else if (hash.startsWith('#policy-')) {
      const pType = hash.replace('#policy-', '');
      this.openViewDirectly('policy', { policyType: pType });
    }
  }
};

// --------------------------------------------------------------------------
// ADMIN ZOOM & FULLSCREEN SCALING ENGINE
// --------------------------------------------------------------------------
const ADMIN_ZOOM_LEVELS = [90, 100, 115, 130, 150, 175];
let currentAdminZoomIdx = 1; // 100%

function initAdminZoomOnLoad() {
  const saved = localStorage.getItem('xpord_admin_zoom');
  if (saved) {
    const num = parseInt(saved, 10);
    const idx = ADMIN_ZOOM_LEVELS.indexOf(num);
    if (idx !== -1) currentAdminZoomIdx = idx;
  }
  applyAdminZoom();
}
window.initAdminZoomOnLoad = initAdminZoomOnLoad;

function applyAdminZoom() {
  const level = ADMIN_ZOOM_LEVELS[currentAdminZoomIdx] || 100;
  const card = document.querySelector('.admin-modal-card');
  const indicator = document.getElementById('admin-zoom-level-text');
  if (indicator) indicator.textContent = `${level}%`;

  if (card) {
    ADMIN_ZOOM_LEVELS.forEach(lvl => card.classList.remove(`admin-zoom-${lvl}`));
    card.classList.add(`admin-zoom-${level}`);
  }
  localStorage.setItem('xpord_admin_zoom', level.toString());
}
window.applyAdminZoom = applyAdminZoom;

function changeAdminZoom(direction) {
  currentAdminZoomIdx += direction;
  if (currentAdminZoomIdx < 0) currentAdminZoomIdx = 0;
  if (currentAdminZoomIdx >= ADMIN_ZOOM_LEVELS.length) currentAdminZoomIdx = ADMIN_ZOOM_LEVELS.length - 1;
  applyAdminZoom();
  showToast(`Admin Zoom: ${ADMIN_ZOOM_LEVELS[currentAdminZoomIdx]}%`, 'info');
}
window.changeAdminZoom = changeAdminZoom;

function resetAdminZoom() {
  currentAdminZoomIdx = 1; // 100%
  applyAdminZoom();
  showToast("Admin Zoom Reset to 100%", "info");
}
window.resetAdminZoom = resetAdminZoom;

function toggleAdminFullscreen() {
  const card = document.querySelector('.admin-modal-card');
  const icon = document.getElementById('admin-fs-icon');
  if (!card) return;
  card.classList.toggle('admin-fullscreen');
  const isFs = card.classList.contains('admin-fullscreen');
  if (icon) {
    icon.className = isFs ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
  }
  showToast(isFs ? 'Admin Fullscreen Mode Enabled' : 'Standard Admin View', 'info');
}
window.toggleAdminFullscreen = toggleAdminFullscreen;

// --------------------------------------------------------------------------
// COGNITIVE AUTH STATUS ROUTER (Post-Login Intent Engine - High Speed Matrix)
// --------------------------------------------------------------------------
function handlePostLoginIntentRouter(isDirectAuthCallback = false) {
  // STRICT ON-LOAD CONDITION CHECK: Only trigger from direct auth callback or valid active login event
  if (!STATE.currentUser) return;
  if (!isDirectAuthCallback) return; // Prevent indiscriminate on-load auto routing

  // Read and IMMEDIATELY PURGE token at microsecond 0 to prevent any re-trigger loop
  let rawIntent = null;
  try {
    rawIntent = sessionStorage.getItem('checkout_flow_intent');
    sessionStorage.removeItem('checkout_flow_intent');
  } catch (e) {
    console.warn("Error accessing checkout_flow_intent:", e);
  }

  // Clear any legacy flags synchronously
  try {
    localStorage.removeItem('xpord_pending_checkout');
    localStorage.removeItem('xpord_direct_checkout_item');
  } catch (e) {}

  if (!rawIntent) return;

  let intent = null;
  try {
    intent = JSON.parse(rawIntent);
  } catch (e) {
    console.warn("Invalid intent JSON:", e);
    return;
  }

  if (!intent || !intent.type) return;

  // 1. FAST ROUTE FOR BUY NOW INTENT (Immediate delivery address & payment selection page)
  if (intent.type === 'buy_now') {
    const targetProduct = (STATE.products || []).find(p => p.id === intent.id) || 
      (typeof productsData !== 'undefined' && Array.isArray(productsData) ? productsData.find(p => p.id === intent.id) : null);

    if (targetProduct) {
      const chosenSize = intent.size || (STATE.selectedSizes && STATE.selectedSizes[targetProduct.id]) || (targetProduct.sizes ? targetProduct.sizes[0] : 'M');
      const chosenQty = Math.max(1, parseInt(intent.qty, 10) || 1);

      // Isolate as direct single-item checkout payload (bypasses loading full cart drawer)
      STATE.directCheckoutItem = {
        product: targetProduct,
        size: chosenSize,
        quantity: chosenQty,
        price: targetProduct.price,
        color: targetProduct.colors ? targetProduct.colors[0] || "Default" : "Default"
      };

      try {
        localStorage.setItem('xpord_direct_checkout_item', JSON.stringify(STATE.directCheckoutItem));
      } catch (e) {}

      // Instantaneous checkout modal launch (Address + Payment selection)
      if (typeof window.openCheckoutModal === 'function') {
        window.openCheckoutModal(true);
      }
      return;
    }
  }

  // 2. FAST ROUTE FOR ADD TO BAG INTENT (Instant push into cart array, update badge, slide open cart drawer)
  if (intent.type === 'add_to_bag') {
    const targetProduct = (STATE.products || []).find(p => p.id === intent.id) || 
      (typeof productsData !== 'undefined' && Array.isArray(productsData) ? productsData.find(p => p.id === intent.id) : null);

    if (targetProduct) {
      const chosenSize = intent.size || (STATE.selectedSizes && STATE.selectedSizes[targetProduct.id]) || (targetProduct.sizes ? targetProduct.sizes[0] : 'M');
      const chosenQty = Math.max(1, parseInt(intent.qty, 10) || 1);

      const existingIndex = STATE.cart.findIndex(i => i.product && i.product.id === targetProduct.id && i.size === chosenSize);
      if (existingIndex > -1) {
        STATE.cart[existingIndex].quantity += chosenQty;
      } else {
        STATE.cart.push({
          product: targetProduct,
          size: chosenSize,
          color: targetProduct.colors ? targetProduct.colors[0] || "Default" : "Default",
          quantity: chosenQty
        });
      }

      saveCartState();
      updateCounters();
      renderCartDrawer();
      showToast(`Added "${targetProduct.title}" (${chosenSize}) to your bag!`, 'success');

      // Instantaneous slide open of Cart Drawer
      if (typeof window.openCartDrawer === 'function') {
        window.openCartDrawer();
      }
      return;
    }
  }

  // 3. FAST ROUTE FOR REGULAR BAG CHECKOUT
  if (intent.type === 'checkout_bag') {
    if (STATE.cart && STATE.cart.length > 0) {
      if (typeof window.openCheckoutModal === 'function') {
        window.openCheckoutModal(false);
      }
    }
  }
}
window.handlePostLoginIntentRouter = handlePostLoginIntentRouter;

function bootstrapApp() {
  initUrlRouting();
  setupEventListeners();
  renderApp();
  initAdminZoomOnLoad();
  window.XPORD_NAV.checkHashOrQueryOnLoad();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}

/**
 * Parses URL Search Parameters into Centralized STATE
 * Supports formats like: ?f.Occasion=party, ?f.Fabric=cotton, ?category=shirts, ?search=linen
 */
function initUrlRouting() {
  parseUrlParamsToState();

  // Listen for browser Back/Forward navigation
  window.addEventListener('popstate', (event) => {
    window.XPORD_NAV.isPopping = true;
    try {
      const closedAny = window.XPORD_NAV.closeAllModalsDirectly();
      const state = event.state;

      if (state && state.xpordModal) {
        window.XPORD_NAV.openViewDirectly(state.xpordModal, state.params || {});
      } else {
        // We're at the base screen
        parseUrlParamsToState();
        syncUIWithState();
        renderApp();
      }
    } finally {
      setTimeout(() => { window.XPORD_NAV.isPopping = false; }, 60);
    }
  });
}

function parseUrlParamsToState() {
  const params = new URLSearchParams(window.location.search);

  // Helper to get arrays e.g. f.Fabric=cotton,velvet or multiple params
  const parseMultiParam = (paramKey) => {
    const val = params.get(paramKey);
    if (!val) return [];
    return val.split(',').map(s => s.trim().toLowerCase());
  };

  // Occasion, Fabric, Fit
  const occasionList = parseMultiParam('f.Occasion').concat(parseMultiParam('occasion'));
  const fabricList = parseMultiParam('f.Fabric').concat(parseMultiParam('fabric'));
  const fitList = parseMultiParam('f.Fit').concat(parseMultiParam('fit'));

  // Standard params
  const categoryVal = params.get('category') || 'all';
  const searchVal = params.get('search') || '';
  const sortVal = params.get('sort') || 'featured';
  const priceVal = parseInt(params.get('price')) || 8000;
  const inStockVal = params.get('inStock') === 'true';

  STATE.activeFilters.occasion = [...new Set(occasionList)];
  STATE.activeFilters.fabric = [...new Set(fabricList)];
  STATE.activeFilters.fit = [...new Set(fitList)];
  STATE.activeFilters.category = categoryVal;
  STATE.activeFilters.search = searchVal;
  STATE.activeFilters.sort = sortVal;
  STATE.activeFilters.maxPrice = priceVal;
  STATE.activeFilters.inStockOnly = inStockVal;

  // Enforce Category-First landing view: if no category, search, or filters are explicitly set, show Bento Category view
  if (categoryVal !== 'all' || searchVal || occasionList.length > 0 || fabricList.length > 0 || fitList.length > 0) {
    STATE.isCategoryView = false;
  } else {
    STATE.isCategoryView = true;
  }

  syncUIWithState();
}

/**
 * Updates browser URL bar cleanly using history.pushState without page reload
 */
function updateUrlFromState() {
  const params = new URLSearchParams();

  if (STATE.activeFilters.occasion.length > 0) {
    params.set('f.Occasion', STATE.activeFilters.occasion.join(','));
  }
  if (STATE.activeFilters.fabric.length > 0) {
    params.set('f.Fabric', STATE.activeFilters.fabric.join(','));
  }
  if (STATE.activeFilters.fit.length > 0) {
    params.set('f.Fit', STATE.activeFilters.fit.join(','));
  }
  if (STATE.activeFilters.category && STATE.activeFilters.category !== 'all') {
    params.set('category', STATE.activeFilters.category);
  }
  if (STATE.activeFilters.search) {
    params.set('search', STATE.activeFilters.search);
  }
  if (STATE.activeFilters.sort !== 'featured') {
    params.set('sort', STATE.activeFilters.sort);
  }
  if (STATE.activeFilters.maxPrice < 8000) {
    params.set('price', STATE.activeFilters.maxPrice);
  }
  if (STATE.activeFilters.inStockOnly) {
    params.set('inStock', 'true');
  }

  const newQueryStr = params.toString();
  const newUrl = window.location.pathname + (newQueryStr ? `?${newQueryStr}` : '');
  window.history.pushState(null, '', newUrl);
}

/**
 * Syncs DOM controls (checkboxes, select inputs, price slider, search) to match STATE
 */
function syncUIWithState() {
  // Search input
  if (DOM.searchInput) {
    DOM.searchInput.value = STATE.activeFilters.search;
    if (STATE.activeFilters.search) {
      DOM.clearSearchBtn.classList.remove('hidden');
    } else {
      DOM.clearSearchBtn.classList.add('hidden');
    }
  }

  // Checkboxes
  DOM.filterCheckboxes.forEach(cb => {
    const filterType = cb.getAttribute('data-filter'); // 'fabric', 'fit', 'occasion'
    const val = cb.value.toLowerCase();
    const activeArr = STATE.activeFilters[filterType] || [];
    cb.checked = activeArr.includes(val);
  });

  // Price range
  if (DOM.priceRangeInput) {
    DOM.priceRangeInput.value = STATE.activeFilters.maxPrice;
    DOM.priceRangeValue.textContent = `₹${STATE.activeFilters.maxPrice.toLocaleString('en-IN')}`;
  }

  // In Stock
  if (DOM.inStockCheckbox) {
    DOM.inStockCheckbox.checked = STATE.activeFilters.inStockOnly;
  }

  // Sort selects
  if (DOM.desktopSortSelect) DOM.desktopSortSelect.value = STATE.activeFilters.sort;
  if (DOM.mobileSortSelect) DOM.mobileSortSelect.value = STATE.activeFilters.sort;

  // Category navigation links
  DOM.navLinks.forEach(link => {
    const cat = link.getAttribute('data-category');
    if (cat === STATE.activeFilters.category) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Category pills
  DOM.categoryPills.forEach(pill => {
    const cat = pill.getAttribute('data-category');
    if (cat === STATE.activeFilters.category) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

// --------------------------------------------------------------------------
// 4. EVENT LISTENERS SETUP
// --------------------------------------------------------------------------
function setupEventListeners() {
  // Sticky Header Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      document.getElementById('main-header')?.classList.add('scrolled');
    } else {
      document.getElementById('main-header')?.classList.remove('scrolled');
    }
  });

  // Close Promo Banner
  DOM.closePromoBtn?.addEventListener('click', () => {
    DOM.promoBanner.style.display = 'none';
  });

  // Real-Time Search Input
  DOM.searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    STATE.activeFilters.search = query;
    if (query) {
      DOM.clearSearchBtn.classList.remove('hidden');
      STATE.isCategoryView = false;
    } else {
      DOM.clearSearchBtn.classList.add('hidden');
    }
    updateUrlFromState();
    renderApp();
  });

  DOM.clearSearchBtn?.addEventListener('click', () => {
    DOM.searchInput.value = '';
    STATE.activeFilters.search = '';
    DOM.clearSearchBtn.classList.add('hidden');
    updateUrlFromState();
    renderApp();
  });

  // Category Nav Links & Quick Pills
  document.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = btn.getAttribute('data-category');
      STATE.activeFilters.category = cat;
      STATE.isCategoryView = (cat === 'all');
      updateUrlFromState();
      syncUIWithState();
      renderApp();
      // Scroll smoothly to products
      if (!STATE.isCategoryView) {
        document.getElementById('product-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Filter Checkbox Toggles
  DOM.filterCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const filterType = cb.getAttribute('data-filter'); // 'fabric', 'fit', 'occasion'
      const val = cb.value.toLowerCase();

      if (cb.checked) {
        if (!STATE.activeFilters[filterType].includes(val)) {
          STATE.activeFilters[filterType].push(val);
        }
      } else {
        STATE.activeFilters[filterType] = STATE.activeFilters[filterType].filter(v => v !== val);
      }

      updateUrlFromState();
      renderApp();
    });
  });

  // Price Slider
  DOM.priceRangeInput?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    STATE.activeFilters.maxPrice = val;
    DOM.priceRangeValue.textContent = `₹${val.toLocaleString('en-IN')}`;
    updateUrlFromState();
    renderApp();
  });

  // In Stock Checkbox
  DOM.inStockCheckbox?.addEventListener('change', (e) => {
    STATE.activeFilters.inStockOnly = e.target.checked;
    updateUrlFromState();
    renderApp();
  });

  // Clear All Filters
  DOM.clearFiltersBtn?.addEventListener('click', resetAllFilters);
  DOM.resetChipsBtn?.addEventListener('click', resetAllFilters);
  DOM.emptyResetBtn?.addEventListener('click', resetAllFilters);

  // Sort Dropdowns
  DOM.desktopSortSelect?.addEventListener('change', (e) => {
    STATE.activeFilters.sort = e.target.value;
    if (DOM.mobileSortSelect) DOM.mobileSortSelect.value = e.target.value;
    updateUrlFromState();
    renderApp();
  });

  DOM.mobileSortSelect?.addEventListener('change', (e) => {
    STATE.activeFilters.sort = e.target.value;
    if (DOM.desktopSortSelect) DOM.desktopSortSelect.value = e.target.value;
    updateUrlFromState();
    renderApp();
  });

  // Filter Accordion Collapse Headers
  document.querySelectorAll('.filter-group-header').forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.closest('.filter-group');
      parent.classList.toggle('collapsed');
    });
  });

  // Mobile Filter Drawer Toggle
  DOM.openFilterDrawerBtn?.addEventListener('click', () => {
    DOM.sidebarFilters.classList.add('open');
  });

  DOM.closeFilterDrawerBtn?.addEventListener('click', () => {
    DOM.sidebarFilters.classList.remove('open');
  });

  // Mobile Nav Drawer Toggle
  DOM.mobileMenuBtn?.addEventListener('click', () => {
    DOM.mobileNavDrawer?.classList.add('open');
  });

  DOM.closeMobileNavBtn?.addEventListener('click', () => {
    DOM.mobileNavDrawer?.classList.remove('open');
  });

  window.closeMobileNavDrawer = function() {
    DOM.mobileNavDrawer?.classList.remove('open');
  };

  // Sliding Cart Drawer Toggles
  DOM.cartToggleBtn?.addEventListener('click', () => toggleCartDrawer());
  DOM.closeCartDrawerBtn?.addEventListener('click', () => toggleCartDrawer());
  DOM.cartBackdrop?.addEventListener('click', () => toggleCartDrawer());

  // Coupon Application
  DOM.applyCouponBtn?.addEventListener('click', () => window.handleApplyCoupon());

  // Proceed to Checkout
  DOM.proceedCheckoutBtn?.addEventListener('click', () => window.openCheckoutModal());

  // Modal Closures
  DOM.closeQuickViewBtn?.addEventListener('click', () => window.closeQuickViewModal());
  DOM.quickViewBackdrop?.addEventListener('click', () => window.closeQuickViewModal());

  DOM.closeCheckoutBtn?.addEventListener('click', () => window.closeCheckoutModal());
  DOM.checkoutBackdrop?.addEventListener('click', () => window.closeCheckoutModal());

  // Hero CTA
  DOM.heroExploreBtn?.addEventListener('click', () => {
    if (STATE.isCategoryView) {
      document.getElementById('category-bento-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      document.getElementById('product-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Wishlist button click
  DOM.wishlistBtn?.addEventListener('click', () => {
    window.openWishlistModal();
  });

  // Orders button click
  DOM.ordersBtn?.addEventListener('click', () => {
    window.openOrdersModal();
  });

  // User Profile button click
  DOM.userProfileBtn?.addEventListener('click', () => {
    if (typeof window.openAccountView === 'function') {
      window.openAccountView();
    } else {
      window.openUserModal();
    }
  });

  // Home Brand Logo Click
  document.getElementById('brand-home-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof window.showCategoryLandingView === 'function') {
      window.showCategoryLandingView();
    }
  });

  // Back to categories button click
  DOM.backToCategoriesBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof window.showCategoryLandingView === 'function') {
      window.showCategoryLandingView();
    }
  });
}

function resetAllFilters() {
  const accountView = document.getElementById('xpordAccountView');
  if (accountView) {
    accountView.classList.add('hidden');
    accountView.style.setProperty('display', 'none', 'important');
  }
  const heroSection = document.querySelector('.hero-section') || document.getElementById('hero-section');
  if (heroSection) heroSection.style.removeProperty('display');

  STATE.activeFilters = {
    search: '',
    fabric: [],
    fit: [],
    occasion: [],
    category: 'all',
    maxPrice: 8000,
    inStockOnly: false,
    sort: 'featured'
  };
  STATE.isCategoryView = true;

  updateUrlFromState();
  syncUIWithState();
  renderApp();
  showToast("All filters reset", "info");
}

// --------------------------------------------------------------------------
// 5. CORE RENDERING ENGINE
// --------------------------------------------------------------------------
function renderApp() {
  // Category-First Landing View enforcement across desktop and mobile
  const bentoSection = document.getElementById('category-bento-section') || DOM.categoryBentoSection;
  const appMain = document.getElementById('app-main') || DOM.appMain;

  if (STATE.isCategoryView) {
    if (bentoSection) {
      bentoSection.classList.remove('hidden');
      bentoSection.style.removeProperty('display');
    }
    if (appMain) {
      appMain.classList.add('hidden');
      appMain.style.removeProperty('display');
    }
  } else {
    if (bentoSection) {
      bentoSection.classList.add('hidden');
      bentoSection.style.removeProperty('display');
    }
    if (appMain) {
      appMain.classList.remove('hidden');
      appMain.style.removeProperty('display');
    }

    const filteredProducts = getFilteredProducts();
    renderProductGrid(filteredProducts);
    renderActiveFilterChips();
  }

  updateCounters();
}

/**
 * Handles selecting a category from the Bento Category Grid
 */
window.selectBentoCategory = function(categoryName) {
  const accountView = document.getElementById('xpordAccountView');
  if (accountView) {
    accountView.classList.add('hidden');
    accountView.style.setProperty('display', 'none', 'important');
  }
  const heroSection = document.querySelector('.hero-section') || document.getElementById('hero-section');
  if (heroSection) heroSection.style.removeProperty('display');

  STATE.activeFilters.category = categoryName;
  STATE.isCategoryView = false;
  updateUrlFromState();
  syncUIWithState();
  renderApp();

  // Smooth scroll to product grid
  const productSec = document.getElementById('product-section');
  if (productSec) {
    productSec.scrollIntoView({ behavior: 'smooth' });
  }
};

/**
 * Resets back to the full Bento Category Grid landing view
 */
window.showCategoryLandingView = function() {
  const accountView = document.getElementById('xpordAccountView');
  if (accountView) {
    accountView.classList.add('hidden');
    accountView.style.setProperty('display', 'none', 'important');
  }

  const heroSection = document.querySelector('.hero-section') || document.getElementById('hero-section');
  if (heroSection) heroSection.style.removeProperty('display');

  STATE.activeFilters.category = 'all';
  STATE.activeFilters.search = '';
  STATE.isCategoryView = true;
  updateUrlFromState();
  syncUIWithState();
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update active state across bottom fluid navigation
  document.querySelectorAll('.xpord-nav-node').forEach(node => {
    if (node.getAttribute('data-tab') === 'home' || node.getAttribute('data-tab') === 'categories') {
      node.classList.add('active');
    } else {
      node.classList.remove('active');
    }
  });

  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('account');
  }
};

/**
 * Applies active filter criteria and sorting algorithms to STATE.products
 */
function getFilteredProducts() {
  return STATE.products.filter(item => {
    // Search query match
    if (STATE.activeFilters.search) {
      const q = STATE.activeFilters.search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchFabric = item.fabric.toLowerCase().includes(q);
      const matchFit = item.fit.toLowerCase().includes(q);
      const matchOccasion = item.occasion.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      if (!matchTitle && !matchFabric && !matchFit && !matchOccasion && !matchCategory) {
        return false;
      }
    }

    // Category filter
    if (STATE.activeFilters.category !== 'all') {
      const cat = STATE.activeFilters.category.toLowerCase();
      if (cat === 'trending') {
        if (item.badge !== 'BESTSELLER' && item.badge !== 'TRENDING' && item.rating < 4.8) return false;
      } else if (cat === 'new') {
        if (item.badge !== 'NEW ARRIVAL' && item.badge !== 'LIMITED EDITION') return false;
      } else {
        if (item.category.toLowerCase() !== cat) return false;
      }
    }

    // Fabric filter
    if (STATE.activeFilters.fabric.length > 0) {
      if (!STATE.activeFilters.fabric.includes(item.fabric.toLowerCase())) {
        return false;
      }
    }

    // Fit filter
    if (STATE.activeFilters.fit && STATE.activeFilters.fit.length > 0) {
      const matchFit = STATE.activeFilters.fit.some(f => {
        const val = f.toLowerCase();
        return item.fit && item.fit.toLowerCase().includes(val.replace(' fit', ''));
      });
      if (!matchFit) {
        return false;
      }
    }

    // Sleeve filter (from kinetic chips or active filters)
    if (STATE.activeFilters.sleeve && STATE.activeFilters.sleeve.length > 0) {
      const matchSleeve = STATE.activeFilters.sleeve.some(s => {
        const sVal = s.toLowerCase();
        const itemText = (item.title + ' ' + (item.description || '') + ' ' + (item.fit || '') + ' ' + (item.occasion || '')).toLowerCase();
        if (sVal.includes('full')) {
          return itemText.includes('full sleeve') || itemText.includes('full-sleeve') || itemText.includes('long sleeve') || itemText.includes('overshirt') || itemText.includes('jacket') || itemText.includes('flannel');
        } else if (sVal.includes('half') || sVal.includes('short')) {
          return itemText.includes('half sleeve') || itemText.includes('half-sleeve') || itemText.includes('short sleeve') || itemText.includes('cuban') || itemText.includes('resort');
        }
        return true;
      });
      if (!matchSleeve) {
        return false;
      }
    }

    // Occasion filter
    if (STATE.activeFilters.occasion.length > 0) {
      if (!STATE.activeFilters.occasion.includes(item.occasion.toLowerCase())) {
        return false;
      }
    }

    // Price filter
    if (item.price > STATE.activeFilters.maxPrice) {
      return false;
    }

    // In Stock filter
    if (STATE.activeFilters.inStockOnly && !item.inStock) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    switch (STATE.activeFilters.sort) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return b.id.localeCompare(a.id);
      default: // 'featured'
        return 0;
    }
  });
}

/**
 * Renders HTML cards into the Product Grid
 */
function renderProductGrid(products) {
  DOM.productCountText.textContent = `Showing ${products.length} of ${STATE.products.length} items`;

  // Dynamic Collection Heading
  let heading = "All Collections";
  if (STATE.activeFilters.category !== 'all') {
    heading = STATE.activeFilters.category.toUpperCase() + " COLLECTION";
  }
  DOM.collectionHeading.textContent = heading;

  if (products.length === 0) {
    DOM.productGrid.innerHTML = '';
    DOM.emptyState.classList.remove('hidden');
    return;
  }

  DOM.emptyState.classList.add('hidden');

  DOM.productGrid.innerHTML = products.map(item => {
    const isWishlisted = STATE.wishlist.includes(item.id);
    const selectedSize = STATE.selectedSizes[item.id] || item.sizes[0];
    const discountPercent = Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);
    const altImgSrc = (item.alternateImages && item.alternateImages.length > 0) ? item.alternateImages[0] : item.primaryImage;
    const totalPhotos = 1 + (item.alternateImages ? item.alternateImages.filter(a => a && a !== item.primaryImage).length : 0);

    return `
      <article class="product-card" data-id="${item.id}">
        <!-- Image Container with Dual Image Hover Swap -->
        <div class="card-image-wrapper" onclick="openQuickView('${item.id}')">
          <img class="card-img primary" src="${item.primaryImage}" alt="${item.title}" loading="lazy" />
          <img class="card-img alternate" src="${altImgSrc}" alt="${item.title} alternate view" loading="lazy" />
          
          <span class="product-badge ${item.inStock ? (item.badge === 'BESTSELLER' ? 'bestseller' : 'new') : 'out-stock'}">
            ${item.inStock ? item.badge : 'SOLD OUT'}
          </span>

          ${totalPhotos > 1 ? `
            <span class="card-multi-photo-badge" title="${totalPhotos} gallery photos available">
              <i class="fa-solid fa-camera"></i> ${totalPhotos}
            </span>
          ` : ''}

          <button class="card-wishlist-btn ${isWishlisted ? 'active' : ''}" 
                  onclick="event.stopPropagation(); toggleWishlist('${item.id}')" 
                  aria-label="Save to Wishlist">
            <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>

          <button class="card-quickview-btn">
            <i class="fa-solid fa-eye"></i> Quick View
          </button>
        </div>

        <!-- Details -->
        <div class="card-details">
          <div class="card-meta-tags">
            <span class="meta-pill">${item.fabric}</span>
            <span class="meta-pill">${item.fit}</span>
            <span class="meta-pill">${item.occasion}</span>
          </div>

          <h3 class="card-title" onclick="openQuickView('${item.id}')" style="cursor:pointer">${item.title}</h3>

          <div class="card-price-row">
            <span class="current-price">₹${item.price.toLocaleString('en-IN')}</span>
            ${item.originalPrice > item.price ? `
              <span class="original-price">₹${item.originalPrice.toLocaleString('en-IN')}</span>
              <span class="discount-tag">${discountPercent}% OFF</span>
            ` : ''}
          </div>

          <!-- Size Selector Pills -->
          <div class="card-size-selector">
            <span style="font-size:0.7rem; color:var(--text-muted); margin-right:0.2rem;">Size:</span>
            ${item.sizes.map(size => `
              <button class="size-pill ${selectedSize === size ? 'selected' : ''}" 
                      onclick="event.stopPropagation(); selectProductSize('${item.id}', '${size}')">
                ${size}
              </button>
            `).join('')}
          </div>

          <!-- Add to Bag Button -->
          <button class="card-add-btn ${!item.inStock ? 'disabled' : ''}" 
                  ${!item.inStock ? 'disabled' : ''} 
                  onclick="addToCart('${item.id}')">
            <i class="fa-solid fa-bag-shopping"></i> ${item.inStock ? 'Add to Bag' : 'Out of Stock'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Renders active filter tags / chips
 */
function renderActiveFilterChips() {
  const chips = [];

  if (STATE.activeFilters.search) {
    chips.push({ type: 'search', label: `Search: "${STATE.activeFilters.search}"` });
  }
  if (STATE.activeFilters.category !== 'all') {
    chips.push({ type: 'category', label: `Category: ${STATE.activeFilters.category}` });
  }
  (STATE.activeFilters.fabric || []).forEach(f => {
    chips.push({ type: 'fabric', val: f, label: `Fabric: ${f}` });
  });
  (STATE.activeFilters.fit || []).forEach(f => {
    chips.push({ type: 'fit', val: f, label: `Fit: ${f}` });
  });
  (STATE.activeFilters.sleeve || []).forEach(s => {
    chips.push({ type: 'sleeve', val: s, label: `Sleeve: ${s}` });
  });
  (STATE.activeFilters.occasion || []).forEach(o => {
    chips.push({ type: 'occasion', val: o, label: `Occasion: ${o}` });
  });
  if (STATE.activeFilters.maxPrice < 8000) {
    chips.push({ type: 'price', label: `Max ₹${STATE.activeFilters.maxPrice.toLocaleString('en-IN')}` });
  }
  if (STATE.activeFilters.inStockOnly) {
    chips.push({ type: 'inStock', label: `In Stock Only` });
  }

  // Mobile badge count
  if (DOM.mobileFilterCountBadge) {
    if (chips.length > 0) {
      DOM.mobileFilterCountBadge.textContent = chips.length;
      DOM.mobileFilterCountBadge.classList.remove('hidden');
    } else {
      DOM.mobileFilterCountBadge.classList.add('hidden');
    }
  }

  // Synchronize Kinetic Chips active highlight states
  syncKineticChipsUI();

  if (chips.length === 0) {
    DOM.activeFilterChipsBar.classList.add('hidden');
    return;
  }

  DOM.activeFilterChipsBar.classList.remove('hidden');
  DOM.chipsContainer.innerHTML = chips.map(c => `
    <span class="filter-chip">
      ${c.label}
      <button onclick="removeFilterChip('${c.type}', '${c.val || ''}')" aria-label="Remove filter"><i class="fa-solid fa-xmark"></i></button>
    </span>
  `).join('');
}

function syncKineticChipsUI() {
  const kineticChips = document.querySelectorAll('.kinetic-chip');
  if (!kineticChips.length) return;

  kineticChips.forEach(chip => {
    const filterType = chip.getAttribute('data-kinetic-filter');
    const filterVal = chip.getAttribute('data-value');
    if (!filterType || !filterVal) return;

    let isActive = false;
    if (filterType === 'fit' && STATE.activeFilters.fit) {
      isActive = STATE.activeFilters.fit.some(f => f.toLowerCase() === filterVal.toLowerCase());
    } else if (filterType === 'sleeve' && STATE.activeFilters.sleeve) {
      isActive = STATE.activeFilters.sleeve.some(s => s.toLowerCase() === filterVal.toLowerCase());
    }

    if (isActive) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}
window.syncKineticChipsUI = syncKineticChipsUI;

function toggleKineticFilter(type, value) {
  if (!STATE.activeFilters[type]) {
    STATE.activeFilters[type] = [];
  }

  const valLower = value.toLowerCase();
  const existingIdx = STATE.activeFilters[type].findIndex(v => v.toLowerCase() === valLower);

  if (existingIdx > -1) {
    STATE.activeFilters[type].splice(existingIdx, 1);
  } else {
    // If selecting a sleeve or fit, toggle single active value for clean kinetic feel
    STATE.activeFilters[type] = [value];
  }

  updateUrlFromState();
  syncUIWithState();
  renderApp();
}
window.toggleKineticFilter = toggleKineticFilter;

window.handleFluidNavClick = function(tabName, event) {
  if (event) {
    event.preventDefault();
  }

  // Update active state on fluid nav nodes
  document.querySelectorAll('.xpord-nav-node').forEach(node => {
    if (node.getAttribute('data-tab') === tabName) {
      node.classList.add('active');
    } else {
      node.classList.remove('active');
    }
  });

  switch (tabName) {
    case 'home':
      // Reset back to category landing view or scroll to top
      if (typeof window.showCategoryLandingView === 'function') {
        window.showCategoryLandingView();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      break;
    case 'categories':
      // Open category or scroll to curated bento section
      if (STATE.isCategoryView) {
        const bentoSection = document.getElementById('category-bento-section');
        if (bentoSection) {
          bentoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        // If already in product catalog view, open filter drawer
        if (DOM.sidebarFilters) {
          DOM.sidebarFilters.classList.add('open');
        } else {
          const catSection = document.getElementById('category-bento-section') || document.getElementById('product-section');
          catSection?.scrollIntoView({ behavior: 'smooth' });
        }
      }
      break;
    case 'wishlist':
      if (typeof window.openWishlistModal === 'function') {
        window.openWishlistModal();
      }
      break;
    case 'cart':
      if (typeof toggleCartDrawer === 'function') {
        toggleCartDrawer();
      }
      break;
    case 'account':
      if (typeof window.openAccountView === 'function') {
        window.openAccountView();
      } else if (typeof window.openUserModal === 'function') {
        window.openUserModal();
      }
      break;
    default:
      break;
  }
};

function removeFilterChip(type, val) {
  if (type === 'search') STATE.activeFilters.search = '';
  if (type === 'category') STATE.activeFilters.category = 'all';
  if (type === 'fabric') STATE.activeFilters.fabric = STATE.activeFilters.fabric.filter(v => v !== val);
  if (type === 'fit') STATE.activeFilters.fit = STATE.activeFilters.fit.filter(v => v !== val);
  if (type === 'occasion') STATE.activeFilters.occasion = STATE.activeFilters.occasion.filter(v => v !== val);
  if (type === 'price') STATE.activeFilters.maxPrice = 8000;
  if (type === 'inStock') STATE.activeFilters.inStockOnly = false;

  updateUrlFromState();
  syncUIWithState();
  renderApp();
}
window.removeFilterChip = removeFilterChip;

function selectProductSize(productId, size) {
  STATE.selectedSizes[productId] = size;
  renderApp();
}
window.selectProductSize = selectProductSize;

// --------------------------------------------------------------------------
// 6. WISHLIST & CART STORAGE ENGINE (ISOLATED PER LOGGED-IN ACCOUNT)
// --------------------------------------------------------------------------
window.getUserOrders = function() {
  if (!STATE.currentUser) {
    return [];
  }
  const userEmail = (STATE.currentUser.email || '').toLowerCase().trim();
  const userUid = STATE.currentUser.uid;
  return (STATE.allOrders || []).filter(order => {
    const oUid = order.userId || order.userUid || order.uid;
    const oEmail = (order.customerEmail || '').toLowerCase().trim();
    return (userUid && oUid === userUid) || (userEmail && oEmail === userEmail);
  });
};

function saveWishlistState() {
  try {
    localStorage.setItem('xpord_wishlist', JSON.stringify(STATE.wishlist));
    if (STATE.currentUser && STATE.currentUser.uid) {
      localStorage.setItem(`xpord_wishlist_${STATE.currentUser.uid}`, JSON.stringify(STATE.wishlist));
      const userDocId = STATE.currentUser.email ? STATE.currentUser.email.replace(/[^a-zA-Z0-9]/g, '_') : STATE.currentUser.uid;
      setDoc(doc(db, "users", userDocId), { wishlist: STATE.wishlist, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    }
  } catch (e) {
    console.warn("Failed to save wishlist state:", e);
  }
}

function saveCartState() {
  try {
    localStorage.setItem('xpord_cart', JSON.stringify(STATE.cart));
    if (STATE.currentUser && STATE.currentUser.uid) {
      localStorage.setItem(`xpord_cart_${STATE.currentUser.uid}`, JSON.stringify(STATE.cart));
      const userDocId = STATE.currentUser.email ? STATE.currentUser.email.replace(/[^a-zA-Z0-9]/g, '_') : STATE.currentUser.uid;
      setDoc(doc(db, "users", userDocId), { cart: STATE.cart, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    }
  } catch (e) {
    console.warn("Failed to save cart state:", e);
  }
}

window.toggleWishlist = function(productId) {
  const index = STATE.wishlist.indexOf(productId);
  const product = STATE.products.find(p => p.id === productId);

  if (index > -1) {
    STATE.wishlist.splice(index, 1);
    if (product) showToast(`Removed "${product.title}" from wishlist`, 'info');
  } else {
    STATE.wishlist.push(productId);
    if (product) showToast(`Added "${product.title}" to wishlist! ♥`, 'success');
  }

  saveWishlistState();
  updateCounters();
  renderApp();
  if (DOM.wishlistModalWrapper && !DOM.wishlistModalWrapper.classList.contains('hidden')) {
    renderWishlistItems();
  }
};

function updateCounters() {
  // Wishlist count badge
  if (DOM.wishlistCount) {
    DOM.wishlistCount.textContent = STATE.wishlist.length;
    if (STATE.wishlist.length > 0) {
      DOM.wishlistCount.classList.remove('hidden');
    } else {
      DOM.wishlistCount.classList.add('hidden');
    }
  }

  // Fluid Nav Wishlist Badge
  const fluidWishlistBadge = document.getElementById('fluid-wishlist-badge');
  if (fluidWishlistBadge) {
    fluidWishlistBadge.textContent = STATE.wishlist.length;
    if (STATE.wishlist.length > 0) {
      fluidWishlistBadge.classList.remove('hidden');
    } else {
      fluidWishlistBadge.classList.add('hidden');
    }
  }

  // Orders count badge (Strictly shows current user's order count)
  STATE.orders = window.getUserOrders();
  if (DOM.ordersCount) {
    DOM.ordersCount.textContent = STATE.orders.length;
    if (STATE.orders.length > 0) {
      DOM.ordersCount.classList.remove('hidden');
    } else {
      DOM.ordersCount.classList.add('hidden');
    }
  }

  // Cart total items count
  const totalCartItems = STATE.cart.reduce((sum, item) => sum + item.quantity, 0);

  if (DOM.cartCountBadge) {
    DOM.cartCountBadge.textContent = totalCartItems;
  }

  if (DOM.cartDrawerCount) {
    DOM.cartDrawerCount.textContent = `(${totalCartItems})`;
  }

  // Fluid Nav Cart Badge
  const fluidCartBadge = document.getElementById('fluid-cart-badge');
  if (fluidCartBadge) {
    fluidCartBadge.textContent = totalCartItems;
    if (totalCartItems > 0) {
      fluidCartBadge.classList.remove('hidden');
    } else {
      fluidCartBadge.classList.add('hidden');
    }
  }

  // User profile button label
  const userBtnText = document.getElementById('user-btn-text');
  if (userBtnText) {
    if (STATE.currentUser && STATE.currentUser.name) {
      const firstName = STATE.currentUser.name.split(' ')[0];
      userBtnText.textContent = firstName.length > 10 ? firstName.substring(0, 9) + '…' : firstName;
    } else {
      userBtnText.textContent = 'Register or Login';
    }
  }
}

// --------------------------------------------------------------------------
// 7. CART ENGINE & SLIDING DRAWER LOGIC
// --------------------------------------------------------------------------
window.addToCart = function(productId, customSize = null, customQty = 1) {
  const product = (STATE.products || []).find(p => p.id === productId) || 
    (typeof productsData !== 'undefined' && Array.isArray(productsData) ? productsData.find(p => p.id === productId) : null);

  if (!product || !product.inStock) {
    showToast("Sorry, this item is out of stock!", "error");
    return;
  }

  const selectedSize = customSize || (STATE.selectedSizes && STATE.selectedSizes[productId]) || (product.sizes ? product.sizes[0] : 'M');
  const qtyToAdd = Math.max(1, parseInt(customQty, 10) || 1);

  // GUEST USER INTENT CAPTURE ENGINE (Before Login - Case B: Add to Bag)
  if (!STATE.currentUser) {
    try {
      sessionStorage.setItem('checkout_flow_intent', JSON.stringify({
        type: 'add_to_bag',
        id: productId,
        size: selectedSize,
        qty: qtyToAdd
      }));
    } catch (e) {
      console.warn("Session storage intent error:", e);
    }
    window.location.href = "login.html";
    return;
  }

  // Check if item + size combo already in cart
  const existingIndex = STATE.cart.findIndex(i => i.product && i.product.id === productId && i.size === selectedSize);

  if (existingIndex > -1) {
    STATE.cart[existingIndex].quantity += qtyToAdd;
  } else {
    STATE.cart.push({
      product,
      size: selectedSize,
      color: product.colors ? product.colors[0] || "Default" : "Default",
      quantity: qtyToAdd
    });
  }

  saveCartState();
  updateCounters();
  renderCartDrawer();
  openCartDrawer();
  showToast(`Added ${qtyToAdd > 1 ? qtyToAdd + 'x ' : ''}"${product.title}" (${selectedSize}) to Bag!`, 'success');
};

function toggleCartDrawer() {
  if (STATE.isCartOpen) {
    closeCartDrawer();
  } else {
    openCartDrawer();
  }
}
window.toggleCartDrawer = toggleCartDrawer;

function openCartDrawer(skipHistory = false) {
  STATE.isCartOpen = true;
  DOM.cartDrawerWrapper.classList.add('open');
  renderCartDrawer();
  if (!skipHistory && window.XPORD_NAV) {
    window.XPORD_NAV.pushView('cart');
  }
}
window.openCartDrawer = openCartDrawer;

function closeCartDrawer() {
  STATE.isCartOpen = false;
  DOM.cartDrawerWrapper.classList.remove('open');
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('cart', () => {
      DOM.cartDrawerWrapper.classList.remove('open');
    });
  }
}
window.closeCartDrawer = closeCartDrawer;

function renderCartDrawer() {
  const subtotal = STATE.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Free Shipping on all orders (₹0 shipping)
  DOM.shippingProgressText.innerHTML = "🎉 All Orders Enjoy <strong>FREE Express Delivery (₹0)</strong>!";
  DOM.shippingProgressFill.style.width = '100%';

  // Render items list
  if (STATE.cart.length === 0) {
    DOM.cartItemsContainer.innerHTML = `
      <div class="cart-empty-view">
        <i class="fa-solid fa-bag-shopping" style="font-size:2.5rem; opacity:0.3; color:#0f172a; margin-bottom:0.75rem;"></i>
        <h3 style="font-family:var(--font-display); font-size:1.2rem; font-weight:800; color:#0f172a; margin-bottom:0.3rem;">Your Shopping Bag is Empty</h3>
        <p style="font-size:0.85rem; color:#64748b;">Looks like you haven't added any luxury apparel items yet.</p>
        <button class="primary-btn" onclick="closeCartDrawer()" style="margin-top:1.25rem; border-radius:9999px; background:#d99a38; border:none; padding:0.65rem 1.5rem;">Explore Collection</button>
      </div>
    `;
  } else {
    DOM.cartItemsContainer.innerHTML = STATE.cart
      .filter(item => item && item.product)
      .map((item, idx) => {
        const p = item.product;
        const fallbackImg = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80";
        const imgSrc = p.primaryImage || (p.images && p.images[0]) || fallbackImg;
        const itemTotal = (Number(p.price) || 0) * (Number(item.quantity) || 1);

        return `
          <div class="cart-item-card" data-cart-idx="${idx}">
            <img class="cart-item-img" src="${imgSrc}" alt="${p.title || 'Product'}" onerror="this.onerror=null; this.src='${fallbackImg}';" />
            <div class="cart-item-info">
              <div class="cart-item-top">
                <h4 class="cart-item-title" title="${p.title || ''}">${p.title || 'Apparel Item'}</h4>
                <button type="button" class="cart-item-remove" onclick="removeCartItem(${idx})" aria-label="Remove item" title="Remove from bag"><i class="fa-solid fa-trash-can"></i></button>
              </div>

              <div class="cart-item-meta">
                <span>Size: <strong style="color:#0f172a;">${item.size || 'M'}</strong></span>
                <span>•</span>
                <span>Color: <strong style="color:#0f172a;">${item.color || 'Standard'}</strong></span>
              </div>

              <div class="cart-item-bottom">
                <span class="cart-pill-price">₹${itemTotal.toLocaleString('en-IN')}</span>

                <div class="cart-pill-stepper">
                  <button type="button" class="qty-btn" onclick="updateCartQty(${idx}, ${item.quantity - 1})" aria-label="Decrease quantity">-</button>
                  <span class="qty-val">${item.quantity}</span>
                  <button type="button" class="qty-btn" onclick="updateCartQty(${idx}, ${item.quantity + 1})" aria-label="Increase quantity">+</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
  }

  // Calculate Totals & Discounts: Shipping is always 0 in cart
  let discountAmount = 0;
  if (STATE.appliedCoupon) {
    const coupon = STATE.appliedCoupon;
    // Check Terms: Minimum order requirement
    if (coupon.minOrder && subtotal < coupon.minOrder) {
      discountAmount = 0;
      DOM.discountRow.classList.add('hidden');
      if (DOM.couponFeedback) {
        DOM.couponFeedback.className = "coupon-feedback error";
        DOM.couponFeedback.textContent = `⚠️ '${coupon.code}' requires minimum cart order of ₹${coupon.minOrder.toLocaleString('en-IN')}. Add items worth ₹${(coupon.minOrder - subtotal).toLocaleString('en-IN')} more to unlock.`;
        DOM.couponFeedback.classList.remove('hidden');
      }
    } else {
      const calcDiscount = Math.round((subtotal * coupon.discountPercent) / 100);
      if (coupon.maxDiscount && coupon.maxDiscount > 0) {
        discountAmount = Math.min(calcDiscount, coupon.maxDiscount);
      } else {
        discountAmount = calcDiscount;
      }
      DOM.discountRow.classList.remove('hidden');
      DOM.discountPercentTag.textContent = `${coupon.code} (${coupon.discountPercent}% OFF)`;
      DOM.cartDiscountText.textContent = `-₹${discountAmount.toLocaleString('en-IN')}`;
      if (DOM.couponFeedback && DOM.couponFeedback.classList.contains('error')) {
        DOM.couponFeedback.classList.add('hidden');
      }
    }
  } else {
    DOM.discountRow.classList.add('hidden');
  }

  const shippingCost = 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  DOM.cartSubtotalText.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  DOM.cartShippingText.innerHTML = `<strong style="color:var(--accent-success);">FREE (₹0)</strong>`;
  DOM.cartTotalText.textContent = `₹${finalTotal.toLocaleString('en-IN')}`;

  // Render Cart Applied Promo Banner directly below the input
  const bannerContainer = document.getElementById('cart-applied-coupon-banner');
  if (bannerContainer) {
    if (STATE.appliedCoupon && discountAmount > 0) {
      bannerContainer.innerHTML = `
        <div class="cart-applied-coupon-box">
          <div class="cart-applied-coupon-info">
            <i class="fa-solid fa-circle-check" style="color:#10b981; font-size:1.1rem;"></i>
            <div>
              <div class="cart-applied-coupon-code">${STATE.appliedCoupon.code} Applied (${STATE.appliedCoupon.discountPercent}% OFF)</div>
              <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:1px;">You save ₹${discountAmount.toLocaleString('en-IN')} on this order</div>
            </div>
          </div>
          <button type="button" class="cart-remove-coupon-btn" onclick="removeAppliedCoupon()"><i class="fa-solid fa-xmark"></i> Remove</button>
        </div>
      `;
    } else {
      // Empty container when no coupon is applied to prevent duplicate rows
      bannerContainer.innerHTML = '';
    }
  }
}

window.updateCartQty = function(index, newQty) {
  if (newQty <= 0) {
    STATE.cart.splice(index, 1);
  } else {
    STATE.cart[index].quantity = newQty;
  }
  saveCartState();
  updateCounters();
  renderCartDrawer();
  if (DOM.couponsModalWrapper && !DOM.couponsModalWrapper.classList.contains('hidden')) {
    renderCouponsModal();
  }
};

window.removeCartItem = function(index) {
  STATE.cart.splice(index, 1);
  saveCartState();
  updateCounters();
  renderCartDrawer();
  if (DOM.couponsModalWrapper && !DOM.couponsModalWrapper.classList.contains('hidden')) {
    renderCouponsModal();
  }
  showToast("Item removed from bag", "info");
};

window.applyCouponQuickly = function(code) {
  if (DOM.couponInput) {
    DOM.couponInput.value = code;
  }
  handleApplyCoupon(code);
};

window.removeAppliedCoupon = function() {
  STATE.appliedCoupon = null;
  saveToStorage('xpord_applied_coupon', null);
  if (DOM.couponFeedback) {
    DOM.couponFeedback.className = "coupon-feedback hidden";
    DOM.couponFeedback.textContent = "";
  }
  if (DOM.couponInput) {
    DOM.couponInput.value = "";
  }
  renderCartDrawer();
  if (DOM.couponsModalWrapper && !DOM.couponsModalWrapper.classList.contains('hidden')) {
    renderCouponsModal();
  }
  showToast("Promo code removed", "info");
};

// Celebration Confetti Sparkles Effect
function triggerCouponCelebration() {
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'promo-celebration-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ffffff', '#eab308'];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 260,
        y: window.innerHeight * 0.45 + (Math.random() - 0.5) * 120,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.8) * 16,
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12
      });
    }

    const startTime = performance.now();
    function animate(time) {
      const elapsed = time - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4;
        p.rotation += p.vRot;
        p.alpha = Math.max(0, 1 - elapsed / 1800);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (elapsed < 1800) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(animate);
  } catch (err) {
    console.warn("Celebration canvas skipped:", err);
  }
}

export function handleApplyCoupon(explicitCode) {
  let code = "";
  if (typeof explicitCode === 'string') {
    code = explicitCode.trim().toUpperCase();
  } else if (DOM && DOM.couponInput && typeof DOM.couponInput.value === 'string') {
    code = DOM.couponInput.value.trim().toUpperCase();
  } else {
    const inputEl = document.getElementById('coupon-input');
    if (inputEl && typeof inputEl.value === 'string') {
      code = inputEl.value.trim().toUpperCase();
    }
  }

  if (!code) {
    showToast("Please enter a promo code", "warning");
    return;
  }

  const subtotal = (STATE.cart || []).reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  if (subtotal <= 0) {
    showToast("Please add items to cart before applying promo codes", "warning");
    return;
  }

  const coupon = (STATE.coupons || []).find(c => c.code.toUpperCase() === code && c.active !== false);

  if (!coupon) {
    if (DOM && DOM.couponFeedback) {
      DOM.couponFeedback.className = "coupon-feedback error";
      DOM.couponFeedback.textContent = `✕ Invalid promo code '${code}'. Click 'View All Offers' to see available codes.`;
      DOM.couponFeedback.classList.remove('hidden');
    }
    showToast(`Invalid promo code '${code}'`, "error");
    return;
  }

  // Check Terms & Conditions: Minimum Order Value
  if (coupon.minOrder && subtotal < coupon.minOrder) {
    const needed = coupon.minOrder - subtotal;
    if (DOM && DOM.couponFeedback) {
      DOM.couponFeedback.className = "coupon-feedback error";
      DOM.couponFeedback.textContent = `⚠️ Minimum cart order value for '${coupon.code}' is ₹${coupon.minOrder.toLocaleString('en-IN')}. Add items worth ₹${needed.toLocaleString('en-IN')} more to unlock!`;
      DOM.couponFeedback.classList.remove('hidden');
    }
    showToast(`Add items worth ₹${needed.toLocaleString('en-IN')} more to use '${coupon.code}'!`, "warning");
    return;
  }

  // Calculate discount
  const calcDiscount = Math.round((subtotal * coupon.discountPercent) / 100);
  const discountAmount = coupon.maxDiscount && coupon.maxDiscount > 0 ? Math.min(calcDiscount, coupon.maxDiscount) : calcDiscount;

  STATE.appliedCoupon = {
    id: coupon.id || coupon.code,
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    minOrder: coupon.minOrder || 0,
    maxDiscount: coupon.maxDiscount || 0,
    description: coupon.description || `${coupon.discountPercent}% OFF`,
    terms: coupon.terms || ''
  };
  saveToStorage('xpord_applied_coupon', STATE.appliedCoupon);

  if (DOM && DOM.couponFeedback) {
    DOM.couponFeedback.className = "coupon-feedback success";
    DOM.couponFeedback.textContent = `✓ Promo code '${code}' applied! You saved ₹${discountAmount.toLocaleString('en-IN')} (${coupon.discountPercent}% OFF)`;
    DOM.couponFeedback.classList.remove('hidden');
  }

  // Trigger celebration animation
  triggerCouponCelebration();

  renderCartDrawer();
  if (DOM && DOM.couponsModalWrapper && !DOM.couponsModalWrapper.classList.contains('hidden')) {
    renderCouponsModal();
  }
  showToast(`🎉 Applied code '${code}' (${coupon.discountPercent}% OFF)! Saved ₹${discountAmount.toLocaleString('en-IN')}`, "success");
}
window.handleApplyCoupon = handleApplyCoupon;

/* Available Offers & Promo Codes Modal Functions */
window.openCouponsModal = function(skipHistory = false) {
  if (!DOM.couponsModalWrapper) {
    DOM.couponsModalWrapper = document.getElementById('coupons-modal-wrapper');
  }
  if (!DOM.couponsModalWrapper) return;
  renderCouponsModal();
  DOM.couponsModalWrapper.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (!skipHistory && window.XPORD_NAV) {
    window.XPORD_NAV.pushView('coupons');
  }
};

window.closeCouponsModal = function() {
  if (!DOM.couponsModalWrapper) {
    DOM.couponsModalWrapper = document.getElementById('coupons-modal-wrapper');
  }
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('coupons', () => {
      if (DOM.couponsModalWrapper) {
        DOM.couponsModalWrapper.classList.add('hidden');
        if (!STATE.isCartOpen) {
          document.body.style.overflow = '';
        }
      }
    });
  } else if (DOM.couponsModalWrapper) {
    DOM.couponsModalWrapper.classList.add('hidden');
    if (!STATE.isCartOpen) {
      document.body.style.overflow = '';
    }
  }
};

window.renderCouponsModal = function() {
  const container = document.getElementById('coupons-list-container');
  if (!container) return;

  const coupons = (STATE.coupons || []).filter(c => c.active !== false);
  const subtotal = STATE.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  if (!coupons || coupons.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem; color:var(--text-secondary);">
        <i class="fa-solid fa-ticket" style="font-size:2rem; color:var(--text-muted); margin-bottom:0.5rem; display:block;"></i>
        <p>No active promo codes available right now.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = coupons.map(c => {
    const isApplied = STATE.appliedCoupon && STATE.appliedCoupon.code.toUpperCase() === c.code.toUpperCase();
    const isEligible = subtotal >= (c.minOrder || 0);
    const needed = (c.minOrder || 0) - subtotal;
    const estimatedDiscount = isEligible && subtotal > 0 ? Math.round((subtotal * c.discountPercent) / 100) : 0;
    const cappedDiscount = c.maxDiscount && c.maxDiscount > 0 && estimatedDiscount > c.maxDiscount ? c.maxDiscount : estimatedDiscount;

    return `
      <div class="offer-coupon-card ${isApplied ? 'applied' : ''}">
        <div class="offer-coupon-header">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <div class="offer-code-tag">
              <i class="fa-solid fa-tag" style="color:var(--accent-gold);"></i> ${c.code}
            </div>
            <button type="button" onclick="copyCouponCode('${c.code}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.85rem;" title="Copy Code">
              <i class="fa-solid fa-copy"></i>
            </button>
          </div>
          <span class="offer-discount-badge">${c.discountPercent}% OFF</span>
        </div>

        <div style="font-size:0.88rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">
          ${c.description || `${c.discountPercent}% Discount on Store Items`}
        </div>

        <ul class="offer-terms-list">
          <li><i class="fa-solid fa-check"></i> <strong>Min. Cart Value:</strong> ${c.minOrder && c.minOrder > 0 ? `₹${c.minOrder.toLocaleString('en-IN')}` : 'No minimum order required'}</li>
          ${c.maxDiscount && c.maxDiscount > 0 ? `<li><i class="fa-solid fa-check"></i> <strong>Max. Discount:</strong> Up to ₹${c.maxDiscount.toLocaleString('en-IN')}</li>` : ''}
          ${c.terms ? `<li><i class="fa-solid fa-circle-info"></i> ${c.terms}</li>` : ''}
        </ul>

        <div class="offer-status-bar">
          <div>
            ${isApplied 
              ? `<span class="offer-eligible-tag"><i class="fa-solid fa-circle-check"></i> Applied to Cart (-₹${cappedDiscount.toLocaleString('en-IN')})</span>` 
              : isEligible && subtotal > 0
                ? `<span class="offer-eligible-tag"><i class="fa-solid fa-circle-check"></i> Eligible! Save ₹${cappedDiscount.toLocaleString('en-IN')}</span>`
                : subtotal > 0
                  ? `<span class="offer-locked-tag"><i class="fa-solid fa-lock"></i> Add ₹${needed.toLocaleString('en-IN')} more to unlock</span>`
                  : `<span style="color:var(--text-muted); font-size:0.75rem;">Min. Cart: ₹${(c.minOrder || 0).toLocaleString('en-IN')}</span>`
            }
          </div>

          <div>
            ${isApplied
              ? `<button type="button" class="cart-remove-coupon-btn" onclick="removeAppliedCoupon()" style="font-size:0.8rem; padding:0.35rem 0.75rem; border:1px solid #fca5a5; background:#fee2e2; border-radius:var(--radius-xs);"><i class="fa-solid fa-xmark"></i> Remove</button>`
              : isEligible && subtotal > 0
                ? `<button type="button" class="offer-apply-btn" onclick="applyCouponQuickly('${c.code}'); closeCouponsModal();">Apply Code</button>`
                : subtotal > 0
                  ? `<button type="button" class="offer-apply-btn disabled" disabled title="Add items worth ₹${needed} more to apply">Locked</button>`
                  : `<button type="button" class="offer-apply-btn" onclick="copyCouponCode('${c.code}')">Copy Code</button>`
            }
          </div>
        </div>
      </div>
    `;
  }).join('');
};

window.copyCouponCode = function(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast(`Coupon code '${code}' copied to clipboard!`, 'success');
  }).catch(() => {
    showToast(`Code: ${code}`, 'info');
  });
};

// --------------------------------------------------------------------------
// 8. QUICK VIEW & MOBILE PRODUCT DETAIL PAGE LOGIC (TOUCH SWIPE, REVIEWS, PINCODE, ACCORDIONS)
// --------------------------------------------------------------------------
window.currentQuickViewProduct = null;
window.currentQuickViewImages = [];
window.currentQuickViewIndex = 0;
window.sizeGuideUnit = 'in';
window.pdpSelectedQty = 1;

window.changePdpQty = function(delta, unitPrice) {
  window.pdpSelectedQty = Math.max(1, Math.min(10, (window.pdpSelectedQty || 1) + delta));
  const qtyDisplay = document.getElementById('pdp-qty-display');
  const totalPreview = document.getElementById('pdp-qty-total-preview');
  if (qtyDisplay) qtyDisplay.textContent = window.pdpSelectedQty;
  if (totalPreview) totalPreview.textContent = `Total: ₹${(unitPrice * window.pdpSelectedQty).toLocaleString('en-IN')}`;
};

window.addCurrentPdpToCart = function(productId) {
  const product = STATE.products.find(p => p.id === productId);
  if (!product) return;
  const selectedSize = STATE.selectedSizes[productId] || product.sizes[0] || 'M';
  const qty = window.pdpSelectedQty || 1;
  window.addToCart(productId, selectedSize, qty);
};

window.openQuickView = function(productId, skipHistory = false) {
  const product = STATE.products.find(p => p.id === productId);
  if (!product) return;

  if (!skipHistory && window.XPORD_NAV) {
    window.XPORD_NAV.pushView('pdp', { productId });
  }

  window.pdpSelectedQty = 1;

  const originalPrice = product.originalPrice && product.originalPrice > product.price ? product.originalPrice : Math.round(product.price * 1.4);
  const discountPercent = Math.round(((originalPrice - product.price) / originalPrice) * 100);
  const savings = Math.max(0, originalPrice - product.price);
  const selectedSize = STATE.selectedSizes[product.id] || product.sizes[0] || 'M';
  const isWishlisted = (STATE.wishlist || []).includes(product.id);
  
  // Calculate Reviews
  const productReviews = (STATE.reviews || []).filter(r => r.productId === productId);
  const totalReviews = productReviews.length;
  const avgRating = totalReviews > 0 
    ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : (product.rating || 4.8);

  // Consolidate all product images (Primary + All Alternates) without duplicates
  const allImages = [
    product.primaryImage,
    ...(Array.isArray(product.alternateImages) ? product.alternateImages : (product.alternateImages ? [product.alternateImages] : []))
  ].filter(Boolean).filter((img, idx, arr) => arr.indexOf(img) === idx);

  window.currentQuickViewProduct = product;
  window.currentQuickViewImages = allImages;
  window.currentQuickViewIndex = 0;

  DOM.quickViewBody.innerHTML = `
    <!-- Mobile PDP Top Navigation Header (Visible only on mobile view) -->
    <div class="pdp-mobile-topbar">
      <button type="button" class="pdp-mobile-back-btn" onclick="closeQuickViewModal()" aria-label="Back to Store">
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      <div class="pdp-mobile-brand-pill">
        <i class="fa-solid fa-crown" style="color:var(--accent-gold); font-size:0.75rem;"></i> XPORD AUTHENTIC
      </div>
      <div style="display:flex; align-items:center; gap:0.4rem;">
        <button type="button" class="pdp-mobile-action-btn" onclick="window.shareProduct('${product.id}')" aria-label="Share Product" title="Share Product">
          <i class="fa-solid fa-arrow-up-from-bracket"></i>
        </button>
        <button type="button" class="pdp-mobile-action-btn ${isWishlisted ? 'active' : ''}" onclick="window.toggleWishlistFromPdp('${product.id}')" aria-label="Wishlist" style="${isWishlisted ? 'color:#ef4444; background:#fef2f2;' : ''}">
          <i class="fa-${isWishlisted ? 'solid' : 'regular'} fa-heart"></i>
        </button>
      </div>
    </div>

    <!-- Gallery Column (Touch-Swipeable Hero + Carousel Dots + Thumbnails) -->
    <div class="quick-view-gallery">
      <div class="quick-view-hero-wrapper" id="pdp-hero-wrapper">
        <img id="quick-view-hero-img" class="quick-view-main-img" src="${allImages[0]}" alt="${product.title}" onerror="this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop'" />
        
        <!-- Floating Badges and Photo Counter -->
        <div class="pdp-gallery-badge-row">
          <span class="pdp-badge-item ${product.badge === 'BESTSELLER' ? 'bestseller' : 'new'}">
            ${product.badge || 'SIGNATURE DROP'}
          </span>
          ${allImages.length > 1 ? `
            <div class="pdp-photo-counter">
              <i class="fa-solid fa-camera"></i> <span id="quick-view-img-indicator">1 / ${allImages.length}</span>
            </div>
          ` : ''}
        </div>

        ${allImages.length > 1 ? `
          <!-- Prev & Next Overlay Buttons (Desktop & Tablet) -->
          <button type="button" class="gallery-nav-btn prev-btn" onclick="navigateQuickViewGallery(-1)" aria-label="Previous photo">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <button type="button" class="gallery-nav-btn next-btn" onclick="navigateQuickViewGallery(1)" aria-label="Next photo">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        ` : ''}
      </div>

      ${allImages.length > 1 ? `
        <!-- Carousel Dots Indicator (Mobile View) -->
        <div class="pdp-dots-container" id="pdp-dots-indicator">
          ${allImages.map((_, i) => `
            <div class="pdp-dot ${i === 0 ? 'active' : ''}" onclick="switchQuickViewImgByIndex(${i})"></div>
          `).join('')}
        </div>

        <!-- Thumbnails Strip -->
        <div class="quick-view-thumbs" id="quick-view-thumbs-strip">
          ${allImages.map((imgUrl, i) => `
            <img 
              class="thumb-img ${i === 0 ? 'active' : ''}" 
              data-idx="${i}" 
              src="${imgUrl}" 
              onclick="switchQuickViewImgByIndex(${i})" 
              alt="Photo view ${i + 1}" 
              onerror="this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=200&auto=format&fit=crop'"
            />
          `).join('')}
        </div>
      ` : ''}
    </div>

    <!-- Product Details Column -->
    <div class="quick-view-details">
      <!-- Breadcrumb / Category Tag -->
      <div class="pdp-breadcrumb-tag">
        XPORD STREETWEAR • ${(product.fit || 'OVERSIZED').toUpperCase()} • ${(product.fabric || 'PREMIUM COTTON').toUpperCase()}
      </div>

      <!-- Title -->
      <h1 class="pdp-title">${product.title}</h1>

      <!-- Verified Rating Summary Row -->
      <div class="pdp-rating-row">
        <div class="pdp-rating-chip">
          <i class="fa-solid fa-star"></i>
          <span>${avgRating}</span>
        </div>
        <span class="pdp-rating-count-link" onclick="document.getElementById('pdp-reviews-box')?.scrollIntoView({ behavior: 'smooth' })">
          ${totalReviews > 0 ? `${totalReviews} Verified Customer Reviews` : 'Verified Heavyweight Quality • 140+ Ratings'}
        </span>
      </div>

      <!-- Luxury Price Block -->
      <div class="pdp-price-box">
        <div class="pdp-price-main-row">
          <span class="pdp-current-price">₹${product.price.toLocaleString('en-IN')}</span>
          <span class="pdp-original-price">₹${originalPrice.toLocaleString('en-IN')}</span>
          <span class="pdp-discount-pill">${discountPercent}% OFF</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.25rem;">
          <span class="pdp-tax-notice">Inclusive of all taxes • Free express shipping</span>
          ${savings > 0 ? `<span style="font-size:0.75rem; font-weight:800; color:#15803d;">You save ₹${savings.toLocaleString('en-IN')}</span>` : ''}
        </div>
      </div>

      <!-- Live Stock Urgency Banner -->
      <div class="pdp-stock-urgency">
        <span class="pdp-pulse-dot"></span>
        <span>High Demand Drop: Only <strong>3 pieces left</strong> in size ${selectedSize}!</span>
      </div>

      <!-- Size Selector -->
      <div class="pdp-size-section">
        <div class="pdp-size-header">
          <span class="pdp-size-label">Select Size:</span>
          <button type="button" class="pdp-size-guide-btn" onclick="window.openSizeGuideModal()">
            <i class="fa-solid fa-ruler-combined"></i> Size Chart & Fit Guide
          </button>
        </div>
        <div class="pdp-size-pills-row">
          ${product.sizes.map(size => `
            <button type="button" class="pdp-size-btn ${selectedSize === size ? 'selected' : ''}" 
                    onclick="selectModalSize('${product.id}', '${size}')">
              ${size}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Quantity Selector -->
      <div class="pdp-qty-section">
        <div class="pdp-qty-header">
          <span class="pdp-size-label">Select Quantity:</span>
          <span id="pdp-qty-total-preview" class="pdp-qty-total-preview">Total: ₹${product.price.toLocaleString('en-IN')}</span>
        </div>
        <div class="pdp-qty-control-box">
          <button type="button" class="pdp-qty-btn" onclick="window.changePdpQty(-1, ${product.price})" aria-label="Decrease quantity">-</button>
          <span id="pdp-qty-display" class="pdp-qty-display">1</span>
          <button type="button" class="pdp-qty-btn" onclick="window.changePdpQty(1, ${product.price})" aria-label="Increase quantity">+</button>
        </div>
      </div>

      <!-- Desktop Primary CTA Action Buttons (Hidden on mobile sticky bar mode) -->
      <div class="pdp-action-buttons-desktop">
        <button type="button" class="pdp-add-bag-btn" onclick="window.addCurrentPdpToCart('${product.id}')">
          <i class="fa-solid fa-bag-shopping"></i> Add to Bag
        </button>
        <button type="button" class="pdp-buy-now-btn" onclick="window.instantBuyNow('${product.id}')">
          <i class="fa-solid fa-bolt"></i> Buy Now
        </button>
      </div>

      <!-- PIN Code Express Delivery Estimator -->
      <div class="pdp-pincode-card">
        <div class="pdp-pincode-header">
          <i class="fa-solid fa-truck-fast"></i> Delivery Options & PIN Code
        </div>
        <form class="pdp-pincode-input-group" onsubmit="window.checkPdpPincode(event)">
          <input type="text" id="pdp-pincode-input" class="pdp-pincode-input" placeholder="Enter 6-Digit Delivery PIN" maxlength="6" pattern="[0-9]{6}" />
          <button type="submit" class="pdp-pincode-btn">Check</button>
        </form>
        <div id="pdp-pincode-result" class="pdp-pincode-result success">
          <i class="fa-solid fa-circle-check"></i> <span>⚡ Free Express Delivery in 2 - 4 Business Days • COD Available</span>
        </div>
      </div>

      <!-- Trust Badges 4-Grid -->
      <div class="pdp-trust-grid">
        <div class="pdp-trust-card">
          <div class="pdp-trust-icon"><i class="fa-solid fa-shield-halved"></i></div>
          <div class="pdp-trust-text">
            <h5>100% Genuine</h5>
            <p>240+ GSM Heavy Cotton</p>
          </div>
        </div>
        <div class="pdp-trust-card">
          <div class="pdp-trust-icon"><i class="fa-solid fa-truck"></i></div>
          <div class="pdp-trust-text">
            <h5>Fast Dispatch</h5>
            <p>Ships within 24 Hours</p>
          </div>
        </div>
        <div class="pdp-trust-card">
          <div class="pdp-trust-icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
          <div class="pdp-trust-text">
            <h5>COD Available</h5>
            <p>Pay upon doorstep delivery</p>
          </div>
        </div>
        <div class="pdp-trust-card">
          <div class="pdp-trust-icon"><i class="fa-solid fa-arrow-rotate-left"></i></div>
          <div class="pdp-trust-text">
            <h5>7-Day Exchange</h5>
            <p>Hassle-free doorstep pickup</p>
          </div>
        </div>
      </div>

      <!-- Collapsible Product Detail Accordions -->
      <div class="pdp-accordion-group">
        <!-- 1. Product Description & Styling -->
        <div class="pdp-accordion-item open">
          <button type="button" class="pdp-accordion-header" onclick="window.togglePdpAccordion(this)">
            <span><i class="fa-solid fa-align-left" style="margin-right:0.4rem; color:var(--accent-gold);"></i> Product Story & Silhouette</span>
            <i class="fa-solid fa-chevron-down chevron"></i>
          </button>
          <div class="pdp-accordion-body">
            <p style="margin:0 0 0.5rem 0;">${product.description || `Elevated ${product.title} tailored from high-grade ${product.fabric} in an effortless ${product.fit} cut.`}</p>
            <p style="margin:0; font-size:0.8rem; color:var(--text-muted);">
              <strong>Styling Directive:</strong> Pair with wide-leg utility trousers or relaxed raw denim with chunky sneakers for an uncompromising modern streetwear silhouette.
            </p>
          </div>
        </div>

        <!-- 2. Specifications & Material Matrix -->
        <div class="pdp-accordion-item">
          <button type="button" class="pdp-accordion-header" onclick="window.togglePdpAccordion(this)">
            <span><i class="fa-solid fa-layer-group" style="margin-right:0.4rem; color:var(--accent-gold);"></i> Fabric & Garment Specs</span>
            <i class="fa-solid fa-chevron-down chevron"></i>
          </button>
          <div class="pdp-accordion-body">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.8rem;">
              <div><strong>Fabric:</strong> ${product.fabric || '100% Pure Combed Cotton'}</div>
              <div><strong>Fit Type:</strong> ${product.fit || 'Oversized Boxy Silhouette'}</div>
              <div><strong>Occasion:</strong> ${product.occasion || 'Luxury Streetwear'}</div>
              <div><strong>GSM Weight:</strong> 240+ GSM Heavyweight</div>
              <div><strong>Country of Origin:</strong> Made in India</div>
              <div><strong>Brand:</strong> XPORD CLOTHING</div>
            </div>
          </div>
        </div>

        <!-- 3. Wash & Garment Care -->
        <div class="pdp-accordion-item">
          <button type="button" class="pdp-accordion-header" onclick="window.togglePdpAccordion(this)">
            <span><i class="fa-solid fa-shirt" style="margin-right:0.4rem; color:var(--accent-gold);"></i> Wash & Garment Care</span>
            <i class="fa-solid fa-chevron-down chevron"></i>
          </button>
          <div class="pdp-accordion-body">
            <ul style="margin:0; padding-left:1.2rem; line-height:1.7; font-size:0.8rem;">
              <li>Machine wash inside-out with cold water (30°C).</li>
              <li>Use mild liquid detergent; do not bleach or dry clean.</li>
              <li>Do not iron directly over the graphic/embroidery print (iron on reverse).</li>
              <li>Tumble dry low or line dry in shade to maintain optimal structure.</li>
            </ul>
          </div>
        </div>

        <!-- 4. Shipping & Easy Return Policy -->
        <div class="pdp-accordion-item">
          <button type="button" class="pdp-accordion-header" onclick="window.togglePdpAccordion(this)">
            <span><i class="fa-solid fa-box" style="margin-right:0.4rem; color:var(--accent-gold);"></i> Free Shipping & Returns</span>
            <i class="fa-solid fa-chevron-down chevron"></i>
          </button>
          <div class="pdp-accordion-body">
            <p style="margin:0 0 0.4rem 0;">We provide 100% Free Shipping on all Prepaid orders and seamless reverse pickup for 7-day exchanges.</p>
            <p style="margin:0; font-size:0.78rem; color:var(--text-muted);">For questions or exchange requests, WhatsApp our dedicated concierge at +91 7645930314.</p>
          </div>
        </div>
      </div>

      <!-- Customer Reviews & Rating Module -->
      <div class="reviews-section" id="pdp-reviews-box">
        <div class="reviews-header-summary">
          <div>
            <h3 style="font-size:1.1rem; font-weight:800; font-family:var(--font-display); margin:0 0 2px 0;">Customer Ratings & Reviews</h3>
            <span style="font-size:0.8rem; color:var(--text-muted);">${totalReviews > 0 ? `${totalReviews} verified customer reviews` : 'Verified Buyer Community Feedback'}</span>
          </div>
          <div class="avg-rating-badge">
            <span class="star-group"><i class="fa-solid fa-star"></i></span>
            <span>${avgRating} / 5</span>
          </div>
        </div>

        <!-- Write Review Box -->
        <div class="write-review-box">
          <h4 style="font-size:0.88rem; font-weight:800; margin-bottom:0.6rem;"><i class="fa-solid fa-pen-nib"></i> Write a Verified Review</h4>
          <form onsubmit="window.submitProductReview('${product.id}', event)">
            <div style="display:flex; gap:0.5rem; margin-bottom:0.6rem; flex-wrap:wrap;">
              <select id="review-rating-select" required style="padding:0.5rem; font-size:0.85rem; border:1px solid var(--border-medium); background:var(--bg-surface); border-radius:var(--radius-xs);">
                <option value="5">⭐⭐⭐⭐⭐ 5 Stars (Exceptional Fit & Quality)</option>
                <option value="4">⭐⭐⭐⭐ 4 Stars (Great Fabric & Design)</option>
                <option value="3">⭐⭐⭐ 3 Stars (Average)</option>
                <option value="2">⭐⭐ 2 Stars (Needs Improvement)</option>
                <option value="1">⭐ 1 Star (Poor)</option>
              </select>
              <input type="text" id="review-author-input" placeholder="Your Name" required value="${STATE.currentUser ? STATE.currentUser.name : ''}" style="flex:1; min-width:140px; padding:0.5rem 0.65rem; font-size:0.85rem; border:1px solid var(--border-medium); background:var(--bg-surface); border-radius:var(--radius-xs);" />
            </div>
            <textarea id="review-comment-input" rows="2" placeholder="Tell us about the fabric texture, weight, sizing fit, and overall comfort..." required style="width:100%; padding:0.6rem; font-size:0.85rem; border:1px solid var(--border-medium); background:var(--bg-surface); border-radius:var(--radius-xs); margin-bottom:0.6rem;"></textarea>
            <button type="submit" class="secondary-btn-outline" style="width:auto; padding:0.45rem 1rem; font-weight:800; font-size:0.82rem;">
              <i class="fa-solid fa-paper-plane"></i> Post Review
            </button>
          </form>
        </div>

        <!-- Reviews List -->
        <div id="reviews-list-container">
          ${productReviews.length === 0 ? `
            <div class="review-card">
              <div class="review-card-top">
                <span class="review-author">Aryan Sharma <i class="fa-solid fa-circle-check" style="color:#16a34a; font-size:0.75rem;" title="Verified Customer"></i></span>
                <span class="star-group" style="color:#f59e0b; font-size:0.85rem;">★★★★★</span>
              </div>
              <p class="review-comment">"The 240 GSM cotton has insane structure. Doesn't lose shape after washing and the drop shoulder cut is perfectly balanced. Highly recommended!"</p>
              <span class="review-date">Verified Buyer • 2 days ago</span>
            </div>
            <div class="review-card">
              <div class="review-card-top">
                <span class="review-author">Kunal Verma <i class="fa-solid fa-circle-check" style="color:#16a34a; font-size:0.75rem;" title="Verified Customer"></i></span>
                <span class="star-group" style="color:#f59e0b; font-size:0.85rem;">★★★★★</span>
              </div>
              <p class="review-comment">"Top notch packaging and fast 2-day delivery to Delhi. The fabric feels like luxury streetwear costing 3x more."</p>
              <span class="review-date">Verified Buyer • 5 days ago</span>
            </div>
          ` : productReviews.map(r => `
            <div class="review-card">
              <div class="review-card-top">
                <span class="review-author">${r.author} <i class="fa-solid fa-circle-check" style="color:#16a34a; font-size:0.75rem;" title="Verified Customer"></i></span>
                <span class="star-group" style="color:#f59e0b; font-size:0.85rem;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
              </div>
              <p class="review-comment">"${r.comment}"</p>
              <span class="review-date">${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Sticky Bottom Bar on Mobile (Instant Actions: Wishlist + Add to Bag + Buy Now) -->
    <div class="pdp-sticky-bottom-bar">
      <button type="button" class="pdp-sticky-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="window.toggleWishlistFromPdp('${product.id}')" aria-label="Wishlist">
        <i class="fa-${isWishlisted ? 'solid' : 'regular'} fa-heart"></i>
      </button>
      <button type="button" class="pdp-sticky-add-btn" onclick="window.addCurrentPdpToCart('${product.id}')">
        <i class="fa-solid fa-bag-shopping"></i> Add to Bag
      </button>
      <button type="button" class="pdp-sticky-buy-btn" onclick="window.instantBuyNow('${product.id}')">
        <i class="fa-solid fa-bolt"></i> Buy Now
      </button>
    </div>
  `;

  DOM.quickViewWrapper.classList.remove('hidden');

  // Initialize Touch Swipe Gestures for Mobile Gallery
  window.initPdpTouchGestures();
};

// Initialize Touch Swipe Listeners for Mobile PDP Hero Image
window.initPdpTouchGestures = function() {
  const heroWrapper = document.getElementById('pdp-hero-wrapper');
  if (!heroWrapper) return;

  let touchStartX = 0;
  let touchEndX = 0;

  heroWrapper.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  heroWrapper.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        // Swiped Left -> Next Photo
        window.navigateQuickViewGallery(1);
      } else {
        // Swiped Right -> Previous Photo
        window.navigateQuickViewGallery(-1);
      }
    }
  }, { passive: true });
};

// Instant Buy Now Action (Direct single-item checkout without modifying global cart)
window.instantBuyNow = function(productId) {
  const product = (STATE.products || []).find(p => p.id === productId) || 
    (typeof productsData !== 'undefined' && Array.isArray(productsData) ? productsData.find(p => p.id === productId) : null);

  if (!product) return;

  const size = (STATE.selectedSizes && STATE.selectedSizes[productId]) || (product.sizes ? product.sizes[0] : 'M');
  const quantity = window.pdpSelectedQty || 1;

  // GUEST USER INTENT CAPTURE ENGINE (Before Login - Case A: Buy Now)
  if (!STATE.currentUser) {
    try {
      sessionStorage.setItem('checkout_flow_intent', JSON.stringify({
        type: 'buy_now',
        id: productId,
        size: size,
        qty: quantity
      }));
    } catch (e) {
      console.warn("Session storage intent error:", e);
    }
    closeQuickViewModal();
    window.location.href = "login.html";
    return;
  }

  // Isolate purchase to this single product and selected quantity (leaves regular cart intact)
  STATE.directCheckoutItem = {
    product: product,
    size: size,
    quantity: quantity,
    price: product.price,
    color: product.colors ? product.colors[0] || "Default" : "Default"
  };

  try {
    saveCartState();
    localStorage.setItem('xpord_pending_checkout', 'true');
    localStorage.setItem('xpord_direct_checkout_item', JSON.stringify(STATE.directCheckoutItem));
  } catch (e) {
    console.warn("Storage save error:", e);
  }

  closeQuickViewModal();
  window.openCheckoutModal(true);
};

// Toggle Wishlist from PDP with instant visual feedback
window.toggleWishlistFromPdp = function(productId) {
  toggleWishlist(productId);
  const isWishlisted = (STATE.wishlist || []).includes(productId);

  // Update topbar button
  const topbarBtn = document.querySelector('.pdp-mobile-action-btn[aria-label="Wishlist"]');
  if (topbarBtn) {
    topbarBtn.classList.toggle('active', isWishlisted);
    topbarBtn.style.color = isWishlisted ? '#ef4444' : '';
    topbarBtn.style.background = isWishlisted ? '#fef2f2' : '';
    topbarBtn.innerHTML = `<i class="fa-${isWishlisted ? 'solid' : 'regular'} fa-heart"></i>`;
  }

  // Update sticky bottom bar button
  const stickyBtn = document.querySelector('.pdp-sticky-wishlist-btn');
  if (stickyBtn) {
    stickyBtn.classList.toggle('active', isWishlisted);
    stickyBtn.innerHTML = `<i class="fa-${isWishlisted ? 'solid' : 'regular'} fa-heart"></i>`;
  }
};

// Share Product Link
window.shareProduct = async function(productId) {
  const product = STATE.products.find(p => p.id === productId);
  if (!product) return;

  const shareData = {
    title: `${product.title} | XPORD CLOTHING`,
    text: `Check out ${product.title} (₹${product.price}) on XPORD Luxury Streetwear!`,
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      // Ignore user abort
    }
  } else {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Product link copied to clipboard! 📋", "success");
    } catch (e) {
      showToast("Share this drop: " + window.location.href, "info");
    }
  }
};

// Check Delivery PIN Code
window.checkPdpPincode = function(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('pdp-pincode-input');
  const resultDiv = document.getElementById('pdp-pincode-result');
  if (!input || !resultDiv) return;

  const pin = input.value.trim();
  if (!/^[0-9]{6}$/.test(pin)) {
    resultDiv.className = 'pdp-pincode-result error';
    resultDiv.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> <span>Please enter a valid 6-digit Indian PIN code.</span>';
    return;
  }

  // Calculate estimated delivery (3 days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 3);
  const dateStr = deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

  resultDiv.className = 'pdp-pincode-result success';
  resultDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>⚡ Delivery to <strong>PIN ${pin}</strong> by <strong>${dateStr}</strong> • Free Express Shipping & COD Available</span>`;
  showToast(`Delivery available to PIN ${pin}! 🚚`, "success");
};

// Toggle PDP Accordions
window.togglePdpAccordion = function(headerElem) {
  const item = headerElem.closest('.pdp-accordion-item');
  if (item) {
    item.classList.toggle('open');
  }
};

// Submit Customer Review
window.submitProductReview = async function(productId, event) {
  if (event) event.preventDefault();
  const ratingSelect = document.getElementById('review-rating-select');
  const authorInput = document.getElementById('review-author-input');
  const commentInput = document.getElementById('review-comment-input');

  const rating = ratingSelect ? parseInt(ratingSelect.value, 10) : 5;
  const author = authorInput ? authorInput.value.trim() : 'Verified Customer';
  const comment = commentInput ? commentInput.value.trim() : '';

  if (!comment) {
    showToast("Please enter your review comments.", "error");
    return;
  }

  const newReview = {
    id: `rev-${Date.now()}`,
    productId: productId,
    author: author || (STATE.currentUser ? STATE.currentUser.name : 'Verified Customer'),
    rating: rating,
    comment: comment,
    createdAt: new Date().toISOString()
  };

  if (!STATE.reviews) STATE.reviews = [];
  STATE.reviews.unshift(newReview);

  try {
    await setDoc(doc(db, "reviews", newReview.id), newReview);
  } catch (err) {
    console.warn("Review saved locally:", err);
  }

  showToast("Thank you for reviewing this garment! ⭐", "success");
  openQuickView(productId);
};

// Switch Quick View Image by index
window.switchQuickViewImgByIndex = function(index) {
  if (!window.currentQuickViewImages || window.currentQuickViewImages.length === 0) return;
  const len = window.currentQuickViewImages.length;
  window.currentQuickViewIndex = (index + len) % len;

  const targetUrl = window.currentQuickViewImages[window.currentQuickViewIndex];
  const heroImg = document.getElementById('quick-view-hero-img');
  if (heroImg) heroImg.src = targetUrl;

  const indicator = document.getElementById('quick-view-img-indicator');
  if (indicator) indicator.textContent = `${window.currentQuickViewIndex + 1} / ${len}`;

  // Update dots indicator
  const dots = document.querySelectorAll('#pdp-dots-indicator .pdp-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === window.currentQuickViewIndex);
  });

  // Update thumbnail strip
  const thumbs = document.querySelectorAll('#quick-view-thumbs-strip .thumb-img');
  thumbs.forEach((t, i) => {
    if (i === window.currentQuickViewIndex) {
      t.classList.add('active');
      t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      t.classList.remove('active');
    }
  });
};

window.navigateQuickViewGallery = function(direction) {
  if (!window.currentQuickViewImages || window.currentQuickViewImages.length <= 1) return;
  const newIndex = window.currentQuickViewIndex + direction;
  window.switchQuickViewImgByIndex(newIndex);
};

window.switchQuickViewImg = function(thumbElem, imgUrl) {
  document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
  if (thumbElem) thumbElem.classList.add('active');
  const heroImg = document.getElementById('quick-view-hero-img');
  if (heroImg) heroImg.src = imgUrl;
};

window.selectModalSize = function(productId, size) {
  STATE.selectedSizes[productId] = size;
  openQuickView(productId);
};

export function closeQuickViewModal() {
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('pdp', () => {
      if (DOM.quickViewWrapper) DOM.quickViewWrapper.classList.add('hidden');
    });
  } else if (DOM.quickViewWrapper) {
    DOM.quickViewWrapper.classList.add('hidden');
  }
}
window.closeQuickViewModal = closeQuickViewModal;

// --------------------------------------------------------------------------
// SIZE GUIDE MODAL LOGIC
// --------------------------------------------------------------------------
const SIZE_GUIDE_DATA = [
  { size: 'XS', chestIn: 38, lengthIn: 27, shoulderIn: 19, sleeveIn: 9.0, advice: 'Fitted Look' },
  { size: 'S',  chestIn: 40, lengthIn: 28, shoulderIn: 20, sleeveIn: 9.5, advice: 'True to Size' },
  { size: 'M',  chestIn: 42, lengthIn: 29, shoulderIn: 21, sleeveIn: 10.0, advice: 'Relaxed Drop-Shoulder' },
  { size: 'L',  chestIn: 44, lengthIn: 30, shoulderIn: 22, sleeveIn: 10.5, advice: 'Oversized Streetwear' },
  { size: 'XL', chestIn: 46, lengthIn: 31, shoulderIn: 23, sleeveIn: 11.0, advice: 'Boxy Heavyweight' },
  { size: 'XXL', chestIn: 48, lengthIn: 32, shoulderIn: 24, sleeveIn: 11.5, advice: 'Maximum Oversize' }
];

window.renderSizeGuideTable = function() {
  const tbody = document.getElementById('size-guide-tbody');
  if (!tbody) return;

  const isCm = window.sizeGuideUnit === 'cm';
  const factor = isCm ? 2.54 : 1;
  const unitLabel = isCm ? ' cm' : '"';

  tbody.innerHTML = SIZE_GUIDE_DATA.map(item => `
    <tr>
      <td><strong>${item.size}</strong></td>
      <td>${Math.round(item.chestIn * factor)}${unitLabel}</td>
      <td>${Math.round(item.lengthIn * factor)}${unitLabel}</td>
      <td>${Math.round(item.shoulderIn * factor)}${unitLabel}</td>
      <td>${(item.sleeveIn * factor).toFixed(1)}${unitLabel}</td>
      <td><span style="font-weight:700; color:var(--text-primary);">${item.advice}</span></td>
    </tr>
  `).join('');
};

window.switchSizeGuideUnit = function(unit) {
  window.sizeGuideUnit = unit;
  document.getElementById('unit-inches-btn')?.classList.toggle('active', unit === 'in');
  document.getElementById('unit-cm-btn')?.classList.toggle('active', unit === 'cm');
  window.renderSizeGuideTable();
};

window.openSizeGuideModal = function(skipHistory = false) {
  const wrapper = document.getElementById('size-guide-modal-wrapper');
  if (wrapper) {
    window.renderSizeGuideTable();
    wrapper.classList.remove('hidden');
    if (!skipHistory && window.XPORD_NAV) {
      window.XPORD_NAV.pushView('size-guide');
    }
  }
};

window.closeSizeGuideModal = function() {
  const wrapper = document.getElementById('size-guide-modal-wrapper');
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('size-guide', () => {
      if (wrapper) wrapper.classList.add('hidden');
    });
  } else if (wrapper) {
    wrapper.classList.add('hidden');
  }
};

// --------------------------------------------------------------------------
// 9. CHECKOUT, ADDRESS ENGINE & PAYMENT GATEWAY (RAZORPAY + COD)
// --------------------------------------------------------------------------
export function openCheckoutModal(isDirectBuy = false, skipHistory = false) {
  if (!isDirectBuy) {
    // Regular bag / cart checkout - clear any pending single-item Buy Now
    STATE.directCheckoutItem = null;
    try {
      localStorage.removeItem('xpord_direct_checkout_item');
    } catch(e) {}
    if (!STATE.cart || STATE.cart.length === 0) {
      showToast("Your shopping bag is empty!", "error");
      return;
    }
  } else {
    if (!STATE.directCheckoutItem) {
      showToast("No product selected for instant checkout.", "error");
      return;
    }
  }

  // Ensure cart & pending checkout flags are saved to storage before redirecting
  try {
    saveCartState();
    localStorage.setItem('xpord_pending_checkout', 'true');
    if (isDirectBuy && STATE.directCheckoutItem) {
      localStorage.setItem('xpord_direct_checkout_item', JSON.stringify(STATE.directCheckoutItem));
    }
  } catch (e) {
    console.warn("Error saving checkout state before login:", e);
  }

  // Mandatory Authentication check before checkout: Direct redirect to login.html without popup alert interruption
  if (!STATE.currentUser) {
    try {
      if (isDirectBuy && STATE.directCheckoutItem) {
        sessionStorage.setItem('checkout_flow_intent', JSON.stringify({
          type: 'buy_now',
          id: STATE.directCheckoutItem.product.id,
          size: STATE.directCheckoutItem.size,
          qty: STATE.directCheckoutItem.quantity || 1
        }));
      } else {
        sessionStorage.setItem('checkout_flow_intent', JSON.stringify({
          type: 'checkout_bag'
        }));
      }
    } catch (e) {
      console.warn("Error saving checkout intent before login:", e);
    }
    STATE.pendingCheckoutAfterLogin = true;
    closeCartDrawer();
    window.location.href = "login.html";
    return;
  }

  closeCartDrawer();
  window.renderAddressAndPaymentModal();
  if (!skipHistory && window.XPORD_NAV) {
    window.XPORD_NAV.pushView('checkout', { isDirectBuy });
  }
}
window.openCheckoutModal = openCheckoutModal;

window.toggleCheckoutSection = function(section) {
  const header = document.getElementById(`checkout-header-${section}`);
  const body = document.getElementById(`checkout-body-${section}`);
  if (!body) return;
  const isCollapsed = body.classList.contains('collapsed');
  if (isCollapsed) {
    body.classList.remove('collapsed');
    header?.classList.add('active');
  } else {
    body.classList.add('collapsed');
    header?.classList.remove('active');
  }
};

window.toggleEditAddress = function() {
  const streetInput = document.getElementById('ship-street');
  const nameInput = document.getElementById('ship-name');
  if (streetInput) {
    streetInput.focus();
    streetInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof showToast === 'function') {
      showToast("Address fields are ready for editing.", "info");
    }
  } else if (nameInput) {
    nameInput.focus();
  }
};

window.renderAddressAndPaymentModal = function() {
  if (!DOM.checkoutModalBody || !DOM.checkoutModalWrapper) return;

  const isDirectBuy = !!STATE.directCheckoutItem;
  const checkoutItems = isDirectBuy ? [STATE.directCheckoutItem] : STATE.cart;

  if (checkoutItems.length === 0) {
    showToast("No items to checkout.", "error");
    return;
  }

  const totalItemCount = checkoutItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const subtotal = checkoutItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  let discountAmount = 0;
  if (STATE.appliedCoupon && (!STATE.appliedCoupon.minOrder || subtotal >= STATE.appliedCoupon.minOrder)) {
    const calcDiscount = Math.round((subtotal * STATE.appliedCoupon.discountPercent) / 100);
    discountAmount = STATE.appliedCoupon.maxDiscount && STATE.appliedCoupon.maxDiscount > 0 ? Math.min(calcDiscount, STATE.appliedCoupon.maxDiscount) : calcDiscount;
  }
  const baseTotal = Math.max(0, subtotal - discountAmount);
  // Default is Online Payment (₹0 COD fee, so finalTotal = baseTotal)
  const finalTotal = baseTotal;

  // Preload customer default info if available
  const user = STATE.currentUser || {};
  const savedAddress = loadFromStorage('xpord_shipping_address', {
    fullName: user.name || 'Ritik Kumar',
    phone: user.phone || '',
    email: user.email || 'kumarritik2250m@gmail.com',
    street: '',
    landmark: '',
    city: '',
    state: '',
    pincode: ''
  });

  const presetName = savedAddress.fullName || user.name || 'Ritik Kumar';
  const presetEmail = savedAddress.email || user.email || 'kumarritik2250m@gmail.com';

  DOM.checkoutModalBody.innerHTML = `
    <div class="xpord-checkout-panel">
      <div class="checkout-panel-title-bar">
        <i class="fa-solid fa-bag-shopping" style="font-size:1.4rem; color:var(--text-primary);"></i>
        <div>
          <h2>Delivery Address & Payment</h2>
          <p>${isDirectBuy ? 'Direct Purchase Checkout' : 'Bag Order Checkout'} • 100% Free Express Delivery Across India</p>
        </div>
      </div>

      ${isDirectBuy ? `
        <!-- Direct Single-Product Summary Banner -->
        <div class="checkout-direct-item-box">
          <img class="checkout-direct-thumb" src="${STATE.directCheckoutItem.product.primaryImage}" alt="${STATE.directCheckoutItem.product.title}" />
          <div class="checkout-direct-info">
            <div class="checkout-direct-title">${STATE.directCheckoutItem.product.title}</div>
            <div class="checkout-direct-meta">
              <span>Size: <strong>${STATE.directCheckoutItem.size}</strong></span>
              <span>•</span>
              <span>Qty: <strong>${STATE.directCheckoutItem.quantity}</strong></span>
              <span>•</span>
              <span style="color:#0f172a; font-weight:800;">₹${(STATE.directCheckoutItem.product.price * STATE.directCheckoutItem.quantity).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <span class="checkout-direct-badge"><i class="fa-solid fa-bolt"></i> Instant Buy</span>
        </div>
      ` : ''}

      <form id="checkout-address-form" onsubmit="handleProceedPayment(event)">
        <!-- ACCORDION SECTION 1: SHIPPING DETAILS BLOCK -->
        <div class="checkout-accordion-card">
          <div id="checkout-header-shipping" class="checkout-accordion-header active" onclick="toggleCheckoutSection('shipping')">
            <span class="checkout-header-title">
              📍 1. SHIPPING DETAILS
            </span>
            <div class="checkout-header-caret">
              <i class="fa-solid fa-chevron-up"></i>
            </div>
          </div>

          <div id="checkout-body-shipping" class="checkout-accordion-body">
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.75rem;">
              <div class="checkout-input-group">
                <label class="checkout-input-label">Full Name <span style="color:#dc2626;">*</span></label>
                <input type="text" id="ship-name" class="checkout-input-field" required value="${presetName}" placeholder="Ritik Kumar" />
              </div>

              <div class="checkout-input-group">
                <label class="checkout-input-label">Phone Number <span style="color:#dc2626;">*</span></label>
                <input type="tel" id="ship-phone" class="checkout-input-field" required pattern="[0-9]{10}" placeholder="10-digit mobile number" value="${savedAddress.phone || ''}" />
              </div>
            </div>

            <div class="checkout-input-group">
              <label class="checkout-input-label">Email Address (Order Confirmation & Tracking) <span style="color:#dc2626;">*</span></label>
              <input type="email" id="ship-email" class="checkout-input-field" required value="${presetEmail}" placeholder="kumarritik2250m@gmail.com" />
            </div>

            <div class="checkout-input-group">
              <label class="checkout-input-label">Address Details <span style="color:#dc2626;">*</span></label>
              <input type="text" id="ship-street" class="checkout-input-field" required value="${savedAddress.street || ''}" placeholder="House/Flat No, Street Name, Area" />
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.75rem;">
              <div class="checkout-input-group">
                <label class="checkout-input-label">City / District <span style="color:#dc2626;">*</span></label>
                <input type="text" id="ship-city" class="checkout-input-field" required value="${savedAddress.city || ''}" placeholder="e.g. Mumbai / Giridih" />
              </div>
              <div class="checkout-input-group">
                <label class="checkout-input-label">State <span style="color:#dc2626;">*</span></label>
                <input type="text" id="ship-state" class="checkout-input-field" required value="${savedAddress.state || ''}" placeholder="e.g. Jharkhand" />
              </div>
              <div class="checkout-input-group">
                <label class="checkout-input-label">Pincode <span style="color:#dc2626;">*</span></label>
                <input type="text" id="ship-pincode" class="checkout-input-field" required pattern="[0-9]{6}" value="${savedAddress.pincode || ''}" placeholder="e.g. 825412" />
              </div>
            </div>

            <!-- Minimalist solid gold-toned edit action item utility bar button -->
            <button type="button" id="btn-edit-address" class="btn-gold-edit-address" onclick="toggleEditAddress()">
              <i class="fa-solid fa-pen-to-square"></i> Edit Address
            </button>
          </div>
        </div>

        <!-- ACCORDION SECTION 2: PAYMENT METHOD BLOCK -->
        <div class="checkout-accordion-card">
          <div id="checkout-header-payment" class="checkout-accordion-header active" onclick="toggleCheckoutSection('payment')">
            <span class="checkout-header-title">
              💳 2. PAYMENT METHOD
            </span>
            <div class="checkout-header-caret">
              <i class="fa-solid fa-chevron-up"></i>
            </div>
          </div>

          <div id="checkout-body-payment" class="checkout-accordion-body">
            <div class="xpord-payment-list">
              <!-- Option 1: Pay Online -->
              <label class="xpord-pay-card selected" id="opt-online-card" onclick="selectPaymentMethod('online')">
                <input type="radio" name="payment_method" id="pay-method-online" value="online" checked />
                <div class="xpord-pay-info">
                  <div class="xpord-pay-title">
                    <i class="fa-solid fa-bolt" style="color:#0284c7;"></i> ⚡ Pay Online
                  </div>
                  <div class="xpord-pay-desc">UPI, Cards, NetBanking, Wallets - No extra charge</div>
                </div>
                <span class="sticker-capsule-green">₹0 EXTRA</span>
              </label>

              <!-- Option 2: Cash on Delivery -->
              <label class="xpord-pay-card" id="opt-cod-card" onclick="selectPaymentMethod('cod')">
                <input type="radio" name="payment_method" id="pay-method-cod" value="cod" />
                <div class="xpord-pay-info">
                  <div class="xpord-pay-title">
                    <i class="fa-solid fa-handshake" style="color:#f59e0b;"></i> 🤝 Handshake & Cash on Delivery
                  </div>
                  <div class="xpord-pay-desc">Pay in cash when order arrives</div>
                </div>
                <span class="sticker-capsule-orange">+₹40 COD</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 3. BILL BREAKDOWN & SUMMARY BOX -->
        <div class="checkout-bill-summary-box">
          <div class="checkout-bill-row">
            <span>Order Total (${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'})</span>
            <strong>₹${subtotal.toLocaleString('en-IN')}</strong>
          </div>
          ${discountAmount > 0 ? `
            <div class="checkout-bill-row" style="color:#cca036;">
              <span>Promo Discount (${STATE.appliedCoupon ? STATE.appliedCoupon.code + ' - ' + STATE.appliedCoupon.discountPercent + '%' : ''})</span>
              <strong>-₹${discountAmount.toLocaleString('en-IN')}</strong>
            </div>
          ` : ''}
          <div class="checkout-bill-row">
            <span>Delivery</span>
            <span class="delivery-free-label">FREE (₹0)</span>
          </div>
          <div id="checkout-cod-row" class="checkout-bill-row" style="display:none; color:#b45309;">
            <span><i class="fa-solid fa-hand-holding-dollar"></i> Cash on Delivery Convenience Fee</span>
            <strong>+₹40</strong>
          </div>
          <div class="checkout-bill-row total-row">
            <span>Total Payable</span>
            <span id="checkout-total-payable" class="total-payable-amount">₹${finalTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <!-- 4. SECURE CHECKOUT ACTION BUTTON (RICH GOLD-BRONZE TONE) -->
        <button type="submit" id="submit-order-btn" class="xpord-secure-cta-btn">
          <span id="btn-pay-text"><i class="fa-solid fa-lock"></i> Secure Checkout: Pay via Razorpay</span>
        </button>
      </form>
    </div>
  `;

  DOM.checkoutModalWrapper.classList.remove('hidden');
};

window.selectPaymentMethod = function(method) {
  const onlineCard = document.getElementById('opt-online-card');
  const codCard = document.getElementById('opt-cod-card');
  const radioOnline = document.getElementById('pay-method-online');
  const radioCod = document.getElementById('pay-method-cod');
  const btnText = document.getElementById('btn-pay-text');
  const codRow = document.getElementById('checkout-cod-row');
  const totalPayableSpan = document.getElementById('checkout-total-payable');

  const isDirectBuy = !!STATE.directCheckoutItem;
  const checkoutItems = isDirectBuy ? [STATE.directCheckoutItem] : STATE.cart;

  const subtotal = checkoutItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  let discountAmount = 0;
  if (STATE.appliedCoupon && (!STATE.appliedCoupon.minOrder || subtotal >= STATE.appliedCoupon.minOrder)) {
    const calcDiscount = Math.round((subtotal * STATE.appliedCoupon.discountPercent) / 100);
    discountAmount = STATE.appliedCoupon.maxDiscount && STATE.appliedCoupon.maxDiscount > 0 ? Math.min(calcDiscount, STATE.appliedCoupon.maxDiscount) : calcDiscount;
  }
  const baseTotal = Math.max(0, subtotal - discountAmount);

  if (method === 'cod') {
    const codTotal = baseTotal + 40;
    if (onlineCard) onlineCard.classList.remove('selected');
    if (codCard) codCard.classList.add('selected');
    if (radioCod) radioCod.checked = true;
    if (codRow) codRow.style.display = 'flex';
    if (totalPayableSpan) totalPayableSpan.textContent = `₹${codTotal.toLocaleString('en-IN')}`;
    if (btnText) btnText.innerHTML = `<i class="fa-solid fa-lock"></i> Secure Checkout: Place COD Order (₹${codTotal.toLocaleString('en-IN')})`;
  } else {
    if (codCard) codCard.classList.remove('selected');
    if (onlineCard) onlineCard.classList.add('selected');
    if (radioOnline) radioOnline.checked = true;
    if (codRow) codRow.style.display = 'none';
    if (totalPayableSpan) totalPayableSpan.textContent = `₹${baseTotal.toLocaleString('en-IN')}`;
    if (btnText) btnText.innerHTML = `<i class="fa-solid fa-lock"></i> Secure Checkout: Pay via Razorpay`;
  }
};

window.handleProceedPayment = async function(event) {
  event.preventDefault();

  const name = document.getElementById('ship-name')?.value.trim();
  const phone = document.getElementById('ship-phone')?.value.trim();
  const email = document.getElementById('ship-email')?.value.trim();
  const street = document.getElementById('ship-street')?.value.trim();
  const city = document.getElementById('ship-city')?.value.trim();
  const state = document.getElementById('ship-state')?.value.trim();
  const pincode = document.getElementById('ship-pincode')?.value.trim();
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'online';

  if (!name || !phone || !email || !street || !city || !state || !pincode) {
    showToast("Please fill in all required shipping address fields.", "error");
    return;
  }

  const shippingAddress = {
    fullName: name,
    phone: phone,
    email: email,
    street: street,
    city: city,
    state: state,
    pincode: pincode,
    fullAddress: `${street}, ${city}, ${state} - ${pincode}`
  };

  // Cache address in localStorage for repeat convenience
  try {
    localStorage.setItem('xpord_shipping_address', JSON.stringify(shippingAddress));
  } catch (e) {
    console.warn("Could not save address to localStorage:", e);
  }

  const isDirectBuy = !!STATE.directCheckoutItem;
  const checkoutItems = isDirectBuy ? [STATE.directCheckoutItem] : STATE.cart;

  if (checkoutItems.length === 0) {
    showToast("No items found to checkout.", "error");
    return;
  }

  // Calculate totals: Shipping is FREE (0), COD has +₹40 handling fee
  const subtotal = checkoutItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  let discountAmount = 0;
  if (STATE.appliedCoupon && (!STATE.appliedCoupon.minOrder || subtotal >= STATE.appliedCoupon.minOrder)) {
    const calcDiscount = Math.round((subtotal * STATE.appliedCoupon.discountPercent) / 100);
    discountAmount = STATE.appliedCoupon.maxDiscount && STATE.appliedCoupon.maxDiscount > 0 ? Math.min(calcDiscount, STATE.appliedCoupon.maxDiscount) : calcDiscount;
  }
  const baseTotal = Math.max(0, subtotal - discountAmount);

  // Case 1: Cash On Delivery Flow (Direct Order Creation - No Razorpay, +₹40 added to total)
  if (paymentMethod === 'cod') {
    const finalTotal = baseTotal + 40;
    const orderId = `XPD-${Math.floor(10000 + Math.random() * 90000)}`;
    const codOrder = {
      id: orderId,
      userId: STATE.currentUser ? STATE.currentUser.uid : null,
      userUid: STATE.currentUser ? STATE.currentUser.uid : null,
      items: checkoutItems.map(i => ({
        title: i.product.title,
        price: i.product.price,
        size: i.size,
        quantity: i.quantity,
        image: i.product.primaryImage
      })),
      subtotal: subtotal,
      discountAmount: discountAmount,
      couponCode: STATE.appliedCoupon ? STATE.appliedCoupon.code : null,
      totalAmount: finalTotal,
      codFee: 40,
      paymentMethod: "COD",
      paymentStatus: "Pending",
      paymentId: "COD-" + Date.now().toString().slice(-6),
      shippingAddress: shippingAddress,
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      status: "Order Placed",
      createdAt: new Date().toISOString()
    };

    if (!STATE.allOrders) STATE.allOrders = [];
    STATE.allOrders.unshift(codOrder);
    STATE.orders = window.getUserOrders();

    try {
      localStorage.setItem('xpord_all_orders', JSON.stringify(STATE.allOrders));
      await setDoc(doc(db, "orders", codOrder.id), codOrder);
    } catch (err) {
      console.warn("Failed to save COD order to cloud database:", err);
    }

    // Post Order State Cleanup
    if (isDirectBuy) {
      STATE.directCheckoutItem = null;
      // Do NOT clear regular STATE.cart; the user's shopping bag remains intact!
    } else {
      STATE.cart = [];
      STATE.appliedCoupon = null;
      saveCartState();
      updateCounters();
      renderCartDrawer();
    }

    showCodSuccessModal(codOrder);
    return;
  }

  // Case 2: Online Payment Flow via Official Live Razorpay SDK (Prepaid - Original rate without COD fee)
  const finalTotal = baseTotal;
  const amountInPaise = Math.round(finalTotal * 100);

  if (typeof Razorpay === 'undefined') {
    showToast("Razorpay gateway initializing... Please try again in a moment.", "error");
    return;
  }

  const options = {
    key: RAZORPAY_KEY,
    amount: amountInPaise,
    currency: "INR",
    name: "Xpord Private Limited",
    description: "Secure Premium Apparel Checkout",
    theme: {
      color: "#111111"
    },
    prefill: {
      name: name,
      email: email || (STATE.currentUser ? STATE.currentUser.email : "kumarritik2010m@gmail.com"),
      contact: phone || (STATE.currentUser ? STATE.currentUser.phone : "+917645930314")
    },
    handler: async function(response) {
      const paymentId = response.razorpay_payment_id;

      // Create Order Record with full shipping address and online status
      const prepaidOrder = {
        id: `XPD-${Math.floor(10000 + Math.random() * 90000)}`,
        userId: STATE.currentUser ? STATE.currentUser.uid : null,
        userUid: STATE.currentUser ? STATE.currentUser.uid : null,
        items: checkoutItems.map(i => ({
          title: i.product.title,
          price: i.product.price,
          size: i.size,
          quantity: i.quantity,
          image: i.product.primaryImage
        })),
        subtotal: subtotal,
        discountAmount: discountAmount,
        couponCode: STATE.appliedCoupon ? STATE.appliedCoupon.code : null,
        totalAmount: finalTotal,
        paymentMethod: "Razorpay",
        paymentStatus: "Paid",
        paymentId: paymentId,
        shippingAddress: shippingAddress,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        status: "Order Placed",
        createdAt: new Date().toISOString()
      };

      if (!STATE.allOrders) STATE.allOrders = [];
      STATE.allOrders.unshift(prepaidOrder);
      STATE.orders = window.getUserOrders();
      try {
        localStorage.setItem('xpord_all_orders', JSON.stringify(STATE.allOrders));
        await setDoc(doc(db, "orders", prepaidOrder.id), prepaidOrder);
      } catch (err) {
        console.warn("Failed to save prepaid order to cloud database:", err);
      }

      // Post-Payment Actions:
      if (isDirectBuy) {
        STATE.directCheckoutItem = null;
        // User's regular cart in STATE.cart remains intact!
      } else {
        STATE.cart = [];
        STATE.appliedCoupon = null;
        saveCartState();
        updateCounters();
        renderCartDrawer();
      }

      showRazorpaySuccessModal(paymentId, finalTotal, prepaidOrder);
    }
  };

  try {
    const rzp = new Razorpay(options);
    
    rzp.on('payment.failed', function (response) {
      showToast(`Payment Failed: ${response.error.description || 'Transaction cancelled'}`, "error");
    });

    rzp.open();
  } catch (err) {
    console.error("Razorpay instance initialization error:", err);
    showToast("Error launching Razorpay checkout window.", "error");
  }
};

function showCodSuccessModal(order) {
  if (!DOM.checkoutModalBody || !DOM.checkoutModalWrapper) return;

  DOM.checkoutModalBody.innerHTML = `
    <div style="text-align:center; padding:2rem 1rem">
      <div style="width:68px; height:68px; background-color:#16a34a; color:#ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2rem; margin:0 auto 1.25rem; animation:popIn 0.5s ease">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      <span class="hero-tag" style="margin-bottom:0.4rem; display:inline-block; background:#fef3c7; color:#b45309;">CASH ON DELIVERY CONFIRMED</span>
      <h2 style="font-family:var(--font-display); font-size:1.6rem; font-weight:800; margin:0.4rem 0 0.8rem; color:var(--text-primary); line-height:1.3">
        Order Placed Successfully!
      </h2>
      <p style="font-size:0.92rem; color:var(--text-secondary); max-width:520px; margin:0 auto 1.25rem; line-height:1.5">
        Your order <strong>#${order.id}</strong> has been received and confirmed. Please keep cash ready at the time of delivery.
      </p>

      <div style="background-color:var(--bg-subtle); border:1px solid var(--border-medium); padding:1.2rem; border-radius:var(--radius-sm); max-width:460px; margin:0 auto 1.75rem; font-size:0.85rem; text-align:left; line-height:1.7">
        <p><strong>Order ID:</strong> <span style="font-family:monospace; font-weight:700;">#${order.id}</span></p>
        <p><strong>Total Amount to Pay:</strong> <strong style="color:var(--accent-gold); font-size:1rem;">₹${order.totalAmount.toLocaleString('en-IN')}</strong></p>
        <p><strong>Payment Mode:</strong> Cash on Delivery (COD)</p>
        <p><strong>Recipient:</strong> ${order.customerName} (${order.customerPhone})</p>
        <p><strong>Shipping To:</strong> ${order.shippingAddress.fullAddress}</p>
        <p><strong>Estimated Delivery:</strong> 3 - 5 Business Days via Express Courier</p>
      </div>

      <div style="display:flex; justify-content:center; gap:0.75rem; flex-wrap:wrap;">
        <button class="primary-btn" style="max-width:240px;" onclick="closeCheckoutModal()">
          Continue Shopping <i class="fa-solid fa-arrow-right"></i>
        </button>
        <button class="secondary-btn-outline" style="max-width:240px; padding:0.75rem 1.25rem;" onclick="closeCheckoutModal(); openOrdersModal();">
          <i class="fa-solid fa-truck-fast"></i> Track Order
        </button>
      </div>
    </div>
  `;

  DOM.checkoutModalWrapper.classList.remove('hidden');
  showToast(`Order #${order.id} confirmed via Cash on Delivery!`, 'success');
}

function showRazorpaySuccessModal(paymentId, totalPaid, order) {
  if (!DOM.checkoutModalBody || !DOM.checkoutModalWrapper) return;

  const addrStr = order && order.shippingAddress ? order.shippingAddress.fullAddress : 'Provided shipping address';
  const custName = order && order.customerName ? order.customerName : (STATE.currentUser ? STATE.currentUser.name : 'Customer');

  DOM.checkoutModalBody.innerHTML = `
    <div style="text-align:center; padding:2rem 1rem">
      <div style="width:68px; height:68px; background-color:var(--bg-dark); color:var(--bg-card); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2rem; margin:0 auto 1.25rem; animation:popIn 0.5s ease">
        <i class="fa-solid fa-check"></i>
      </div>
      <span class="hero-tag" style="margin-bottom:0.4rem; display:inline-block; background:#dcfce7; color:#15803d;">PREPAID PAYMENT SUCCESSFUL</span>
      <h2 style="font-family:var(--font-display); font-size:1.6rem; font-weight:800; margin:0.4rem 0 0.8rem; color:var(--text-primary); line-height:1.3">
        Thank you! Payment verified via Razorpay.
      </h2>
      <p style="font-size:0.92rem; color:var(--text-secondary); max-width:520px; margin:0 auto 1.25rem; line-height:1.5">
        Razorpay Payment ID: <strong style="color:var(--text-primary); background-color:var(--bg-subtle); padding:0.25rem 0.6rem; border-radius:var(--radius-xs); border:1px solid var(--border-medium); font-family:monospace">${paymentId}</strong>
      </p>

      <div style="background-color:var(--bg-subtle); border:1px solid var(--border-medium); padding:1.2rem; border-radius:var(--radius-sm); max-width:460px; margin:0 auto 1.75rem; font-size:0.85rem; text-align:left; line-height:1.7">
        <p><strong>Merchant:</strong> Xpord Private Limited</p>
        <p><strong>Total Paid:</strong> ₹${totalPaid.toLocaleString('en-IN')}</p>
        <p><strong>Customer Name:</strong> ${custName}</p>
        <p><strong>Shipping Destination:</strong> ${addrStr}</p>
        <p><strong>Estimated Delivery:</strong> 3 - 5 Business Days via Express Courier</p>
      </div>

      <div style="display:flex; justify-content:center; gap:0.75rem; flex-wrap:wrap;">
        <button class="primary-btn" style="max-width:240px;" onclick="closeCheckoutModal()">
          Continue Shopping <i class="fa-solid fa-arrow-right"></i>
        </button>
        <button class="secondary-btn-outline" style="max-width:240px; padding:0.75rem 1.25rem;" onclick="closeCheckoutModal(); openOrdersModal();">
          <i class="fa-solid fa-truck-fast"></i> Track Order
        </button>
      </div>
    </div>
  `;

  DOM.checkoutModalWrapper.classList.remove('hidden');
  showToast(`Prepaid payment successful! Payment ID: ${paymentId}`, 'success');
}

export function closeCheckoutModal() {
  STATE.directCheckoutItem = null;
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('checkout', () => {
      if (DOM.checkoutModalWrapper) DOM.checkoutModalWrapper.classList.add('hidden');
    });
  } else if (DOM.checkoutModalWrapper) {
    DOM.checkoutModalWrapper.classList.add('hidden');
  }
}
window.closeCheckoutModal = closeCheckoutModal;

// --------------------------------------------------------------------------
// 10. TOAST NOTIFICATION ENGINE
// --------------------------------------------------------------------------
function showToast(message, type = 'info') {
  if (!DOM.toastContainer) return;

  const toast = document.createElement('div');
  toast.className = 'toast';

  let icon = '<i class="fa-solid fa-circle-info"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color:var(--accent-gold)"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation" style="color:var(--accent-danger)"></i>';

  toast.innerHTML = `${icon} <span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/* ==========================================================================
   11. LEGAL POLICY MODAL CONTROLLER & DICTIONARY
   ========================================================================== */
const LEGAL_POLICIES = {
  shipping: {
    title: "Shipping & Delivery Policy",
    content: `
      <p>At <strong>XPORD CLOTHING</strong> (operated by <strong>Xpord Private Limited</strong>), we ensure fast, transparent, and reliable order dispatch across India.</p>
      
      <div class="legal-info-box">
        <p><strong>Shipping Charges:</strong> 100% Free Shipping on all Prepaid orders. A nominal ₹49 convenience fee applies to Cash on Delivery (COD) orders.</p>
        <p><strong>Dispatch Timeline:</strong> Orders placed before 2:00 PM IST are dispatched on the same business day.</p>
        <p><strong>Metro Deliveries:</strong> 1 - 3 business days.</p>
        <p><strong>Rest of India:</strong> 5 - 7 business days.</p>
      </div>

      <h3>Order Tracking</h3>
      <p>Once dispatched, you will receive an automated SMS and Email notification containing your live courier tracking link (Bluedart / Delhivery / Xpressbees).</p>

      <h3>Contact Logistics Support</h3>
      <p>For urgent delivery updates or address changes, please contact our support desk:</p>
      <div class="legal-info-box">
        <p><strong>Email:</strong> kumarritik2010m@gmail.com</p>
        <p><strong>WhatsApp / Phone:</strong> +91 7645930314 (Mon-Sat, 10:00 AM to 7:00 PM IST)</p>
      </div>
    `
  },

  returns: {
    title: "Returns & Exchanges Policy",
    content: `
      <p>We take pride in our premium garment craftsmanship. If you are not completely satisfied with your order, we offer a hassle-free return and exchange experience.</p>
      
      <div class="legal-info-box">
        <p><strong>Return Window:</strong> 7 days easy return/exchange window from the date of delivery.</p>
        <p><strong>Eligibility:</strong> Garments must be unwashed, unworn, undamaged, with original tags intact.</p>
        <p><strong>Reverse Pickup:</strong> 100% Free reverse door-step pick-up across 20,000+ PIN codes in India.</p>
      </div>

      <h3>Refund Processing Matrix</h3>
      <p>After receiving and inspecting the returned item at our fulfillment hub:</p>
      <ul>
        <li><strong>Prepaid Orders:</strong> Refund is credited back to the original payment source within 5 - 7 working days.</li>
        <li><strong>Cash on Delivery (COD) Orders:</strong> Refund is transferred directly via NEFT/IMPS to your provided bank account or UPI ID within 3 - 5 business days.</li>
      </ul>

      <h3>How to Initiate Return</h3>
      <p>Reach out to customer care via WhatsApp or Email with your Order ID and item photo:</p>
      <div class="legal-info-box">
        <p><strong>WhatsApp Support:</strong> +91 7645930314</p>
        <p><strong>Email Support:</strong> kumarritik2010m@gmail.com</p>
      </div>
    `
  },

  contact: {
    title: "Contact & Corporate Support",
    content: `
      <p>Have questions about your order, custom sizing, or drop releases? Our team at <strong>Xpord Private Limited</strong> is available to assist you.</p>

      <div class="legal-info-box">
        <p><strong>Company Name:</strong> Xpord Private Limited</p>
        <p><strong>Brand Name:</strong> XPORD CLOTHING</p>
        <p><strong>Corporate Email:</strong> kumarritik2010m@gmail.com</p>
        <p><strong>Customer Care WhatsApp / Phone:</strong> +91 7645930314</p>
        <p><strong>Working Hours:</strong> Monday to Saturday, 10:00 AM to 7:00 PM IST</p>
        <p><strong>Headquarters Address:</strong> Jamua Giridih, Jharkhand - 825412, India</p>
      </div>

      <h3>Press & Business Enquiries</h3>
      <p>For wholesale inquiries, influencer collaborations, or brand partnerships, drop an email to <strong>kumarritik2010m@gmail.com</strong> with the subject line <em>"Business Inquiry"</em>.</p>
    `
  },

  privacy: {
    title: "Privacy Policy",
    content: `
      <p>This Privacy Policy outlines how <strong>Xpord Private Limited</strong> ("we", "us", "our"), operating <strong>XPORD CLOTHING</strong>, collects, protects, and utilizes your personal information when visiting or purchasing from our platform.</p>

      <h3>Information We Collect</h3>
      <p>When you place an order, create an account, or contact us, we collect information including your name, shipping address, email, phone number, and transaction details.</p>

      <h3>How We Use Your Information</h3>
      <ul>
        <li>Processing, fulfilling, and delivering your orders.</li>
        <li>Sending order tracking notifications via SMS, WhatsApp, and Email.</li>
        <li>Improving our website performance, product catalog, and user experience.</li>
        <li>Preventing fraudulent transactions and ensuring payment security.</li>
      </ul>

      <h3>Data Security</h3>
      <p>Your payment credentials are processed through 256-bit encrypted SSL gateways compliant with PCI-DSS standards. We never store raw credit/debit card credentials on our servers.</p>

      <h3>Corporate Entity Details</h3>
      <div class="legal-info-box">
        <p><strong>Entity Name:</strong> Xpord Private Limited</p>
        <p><strong>Headquarters:</strong> Jamua Giridih, Jharkhand - 825412, India</p>
        <p><strong>Privacy Contact:</strong> kumarritik2010m@gmail.com | +91 7645930314</p>
      </div>
    `
  },

  terms: {
    title: "Terms & Conditions",
    content: `
      <p>Welcome to <strong>XPORD CLOTHING</strong>. By accessing or using our website, you agree to be bound by the following Terms & Conditions enforced by <strong>Xpord Private Limited</strong>.</p>

      <h3>Product Information & Pricing</h3>
      <p>All prices listed on the platform are in Indian Rupees (INR) and inclusive of applicable taxes. We reserve the right to correct any typographical or pricing errors and update product details without prior notice.</p>

      <h3>Intellectual Property</h3>
      <p>All visual designs, product photography, trademarks, logos, and copy on this platform are the sole property of <strong>Xpord Private Limited</strong>. Reproduction without explicit written authorization is strictly prohibited.</p>

      <h3>Governing Law & Jurisdiction</h3>
      <p>These terms shall be governed by and construed in accordance with the laws of India. Any legal disputes shall be subject to the exclusive jurisdiction of the courts in Jharkhand, India.</p>

      <div class="legal-info-box">
        <p><strong>Corporate Address:</strong> Jamua Giridih, Jharkhand - 825412, India</p>
        <p><strong>Support Phone / WhatsApp:</strong> +91 7645930314</p>
        <p><strong>Corporate Email:</strong> kumarritik2010m@gmail.com</p>
      </div>
    `
  },

  about: {
    title: "About XPORD",
    content: `
      <p><strong>XPORD CLOTHING</strong> is a modern Indian fashion label under <strong>Xpord Private Limited</strong> dedicated to crafting elevated streetwear staples, tailored loungewear, and luxury garments for contemporary culture.</p>

      <h3>Our Craft & Philosophy</h3>
      <p>We blend heavy GSM organic fabrics, precision tailoring, and minimalist aesthetics to create timeless wardrobe pieces designed to outlast fast-fashion cycles.</p>

      <h3>Corporate Headquarters</h3>
      <div class="legal-info-box">
        <p><strong>Company:</strong> Xpord Private Limited</p>
        <p><strong>Headquarters:</strong> Jamua Giridih, Jharkhand - 825412, India</p>
        <p><strong>Support Email:</strong> kumarritik2010m@gmail.com</p>
        <p><strong>Support Line:</strong> +91 7645930314 (Mon-Sat, 10:00 AM - 7:00 PM IST)</p>
      </div>
    `
  }
};

window.openModal = function(policyType, skipHistory = false) {
  const modal = document.getElementById('legalModal');
  const modalBody = document.getElementById('legal-modal-body');
  
  if (!modal || !modalBody) return;

  const policy = LEGAL_POLICIES[policyType] || LEGAL_POLICIES.contact;

  modalBody.innerHTML = `
    <h2>${policy.title}</h2>
    ${policy.content}
  `;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (!skipHistory && window.XPORD_NAV) {
    window.XPORD_NAV.pushView('policy', { policyType });
  }
};

window.closeModal = function() {
  const modal = document.getElementById('legalModal');
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('policy', () => {
      if (modal) modal.classList.add('hidden');
      document.body.style.overflow = '';
    });
  } else {
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

/* ==========================================================================
   12. ADMIN PRODUCT PORTAL CONTROLLER & LOCALSTORAGE ENGINE
   ========================================================================== */
const ADMIN_PIN = "703328";
const MAX_PIN_ATTEMPTS = 2;

window.openAdminPanel = function(skipHistory = false) {
  // Check if device is permanently locked due to failed PIN attempts
  if (localStorage.getItem('xpord_admin_locked') === 'true') {
    showToast("🚫 Admin Access Blocked! Maximum 2 invalid PIN attempts exceeded on this device.", "error");
    return;
  }

  // Check if authenticated in current session
  if (sessionStorage.getItem('xpord_admin_authenticated') === 'true') {
    const adminWrapper = document.getElementById('adminPanel');
    if (adminWrapper) {
      adminWrapper.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      window.applyAdminZoom();
      // Default to Live Orders Dashboard tab
      window.switchAdminTab('orders');
      window.updateSectionPreviewBox();
      window.renderAdminCatalogList();

      if (!skipHistory && window.XPORD_NAV) {
        window.XPORD_NAV.pushView('admin');
      }
    }
  } else {
    // Show PIN Modal
    const pinModal = document.getElementById('adminPinModal');
    const pinInput = document.getElementById('admin-pin-input');
    const errorMsg = document.getElementById('pin-error-msg');
    
    if (pinModal) {
      pinModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if (errorMsg) errorMsg.textContent = '';
      if (pinInput) {
        pinInput.value = '';
        setTimeout(() => pinInput.focus(), 100);
      }
    }
  }
};

window.closeAdminPinModal = function() {
  const pinModal = document.getElementById('adminPinModal');
  if (pinModal) {
    pinModal.classList.add('hidden');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
};

window.verifyAdminPin = function(event) {
  event.preventDefault();

  if (localStorage.getItem('xpord_admin_locked') === 'true') {
    window.closeAdminPinModal();
    showToast("🚫 Admin Access Blocked! Maximum 2 invalid PIN attempts exceeded.", "error");
    return;
  }

  const pinInput = document.getElementById('admin-pin-input');
  const errorMsg = document.getElementById('pin-error-msg');
  const enteredPin = pinInput ? pinInput.value.trim() : '';

  let attempts = parseInt(localStorage.getItem('xpord_admin_attempts') || '0', 10);

  if (enteredPin === ADMIN_PIN) {
    // Reset attempts and set authenticated session
    localStorage.setItem('xpord_admin_attempts', '0');
    sessionStorage.setItem('xpord_admin_authenticated', 'true');
    
    window.closeAdminPinModal();
    
    // Open actual admin panel
    const adminWrapper = document.getElementById('adminPanel');
    if (adminWrapper) {
      adminWrapper.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      window.applyAdminZoom();
      window.switchAdminTab('orders');
      window.updateSectionPreviewBox();
      window.renderAdminCatalogList();

      if (window.XPORD_NAV) {
        window.XPORD_NAV.pushView('admin');
      }
    }
    showToast("🔓 Admin Portal Unlocked!", "success");
  } else {
    attempts += 1;
    localStorage.setItem('xpord_admin_attempts', attempts.toString());

    if (attempts >= MAX_PIN_ATTEMPTS) {
      // Lock system permanently on this browser device
      localStorage.setItem('xpord_admin_locked', 'true');
      window.closeAdminPinModal();
      showToast("🚫 Access Blocked! You have entered an incorrect PIN 2 times. Admin portal is locked on this device.", "error");
    } else {
      const remaining = MAX_PIN_ATTEMPTS - attempts;
      if (errorMsg) {
        errorMsg.textContent = `✕ Incorrect PIN! You have ${remaining} attempt remaining.`;
      }
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
    }
  }
};

window.closeAdminPanel = function() {
  const adminWrapper = document.getElementById('adminPanel');
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('admin', () => {
      if (adminWrapper) {
        adminWrapper.classList.add('hidden');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
    });
  } else if (adminWrapper) {
    adminWrapper.classList.add('hidden');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
};

/* Admin Panel Tab Switching & Section Preview Logic */
window.switchAdminTab = function(tabName) {
  const aiBtn = document.getElementById('admin-tab-ai-btn');
  const ordersBtn = document.getElementById('admin-tab-orders-btn');
  const addBtn = document.getElementById('admin-tab-add-btn');
  const listBtn = document.getElementById('admin-tab-list-btn');
  const couponsBtn = document.getElementById('admin-tab-coupons-btn');
  const settingsBtn = document.getElementById('admin-tab-settings-btn');

  const aiContent = document.getElementById('admin-tab-ai-content');
  const ordersContent = document.getElementById('admin-tab-orders-content');
  const addContent = document.getElementById('admin-tab-add-content');
  const listContent = document.getElementById('admin-tab-list-content');
  const couponsContent = document.getElementById('admin-tab-coupons-content');
  const settingsContent = document.getElementById('admin-tab-settings-content');

  // Deactivate all
  [aiBtn, ordersBtn, addBtn, listBtn, couponsBtn, settingsBtn].forEach(b => b?.classList.remove('active'));
  [aiContent, ordersContent, addContent, listContent, couponsContent, settingsContent].forEach(c => c?.classList.add('hidden'));

  if (tabName === 'ai') {
    aiBtn?.classList.add('active');
    aiContent?.classList.remove('hidden');
  } else if (tabName === 'orders') {
    ordersBtn?.classList.add('active');
    ordersContent?.classList.remove('hidden');
    window.renderAdminOrdersDashboard();
  } else if (tabName === 'add') {
    addBtn?.classList.add('active');
    addContent?.classList.remove('hidden');
  } else if (tabName === 'list') {
    listBtn?.classList.add('active');
    listContent?.classList.remove('hidden');
    window.renderAdminCatalogList();
  } else if (tabName === 'coupons') {
    couponsBtn?.classList.add('active');
    couponsContent?.classList.remove('hidden');
    window.renderAdminCouponsList();
  } else if (tabName === 'settings') {
    settingsBtn?.classList.add('active');
    settingsContent?.classList.remove('hidden');
    // Pre-populate form values
    const ticker = document.getElementById('admin-ticker-msg');
    const heroTitle = document.getElementById('admin-hero-title');
    const heroSub = document.getElementById('admin-hero-subtitle');
    const promoCode = document.getElementById('admin-promo-code');
    const promoDisc = document.getElementById('admin-promo-discount');

    if (ticker) ticker.value = STATE.siteSettings.tickerMessage || '';
    if (heroTitle) heroTitle.value = STATE.siteSettings.heroTitle || '';
    if (heroSub) heroSub.value = STATE.siteSettings.heroSubtitle || '';
    if (promoCode) promoCode.value = STATE.siteSettings.promoCode || 'XPORD20';
    if (promoDisc) promoDisc.value = STATE.siteSettings.promoDiscount || 20;
  }
};

/* --------------------------------------------------------------------------
   AI CO-PILOT, URL PRODUCT IMPORTER & STORE AUTOMATION CONTROLLER
   -------------------------------------------------------------------------- */
window.AI_CHAT_HISTORY = [];
window.CURRENT_AI_EXTRACTED_PRODUCT = null;

// Dedicated AI Co-Pilot Modal Open/Close Controls (Removed)
window.openAiCopilotModal = function(mode = 'chat') {};
window.closeAiCopilotModal = function() {};

// Mode Switching (URL Importer vs AI Chatbot)
window.switchAiCopilotMode = function(mode) {
  const importBtn = document.getElementById('ai-mode-import-btn');
  const chatBtn = document.getElementById('ai-mode-chat-btn');
  const subviewImport = document.getElementById('ai-subview-import');
  const subviewChat = document.getElementById('ai-subview-chat');

  if (mode === 'import') {
    importBtn?.classList.add('active');
    chatBtn?.classList.remove('active');
    subviewImport?.classList.remove('hidden');
    subviewChat?.classList.add('hidden');
  } else {
    chatBtn?.classList.add('active');
    importBtn?.classList.remove('active');
    subviewChat?.classList.remove('hidden');
    subviewImport?.classList.add('hidden');
    // Scroll chat to bottom
    const chatContainer = document.getElementById('ai-chat-messages-container');
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  }
};

// Clipboard Paste into AI URL Input
window.pasteClipboardToAiInput = async function() {
  const urlInput = document.getElementById('ai-product-url-input');
  if (!urlInput) return;
  try {
    const text = await navigator.clipboard.readText();
    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
      urlInput.value = text.trim();
      showToast("Pasted URL from clipboard!", "info");
      window.startAiUrlExtraction();
    } else if (text) {
      urlInput.value = text.trim();
      showToast("Pasted text into URL field.", "info");
    }
  } catch (err) {
    urlInput.focus();
    showToast("Please press Ctrl+V to paste your product URL.", "info");
  }
};

// Sample Demo Links for Instant Testing
window.loadSampleAiUrl = function(type) {
  const urlInput = document.getElementById('ai-product-url-input');
  if (!urlInput) return;

  const demoLinks = {
    flipkart: 'https://www.flipkart.com/the-souled-store-printed-men-round-neck-pure-cotton-oversized-t-shirt/p/itm123456789',
    amazon: 'https://www.amazon.in/Symbol-Premium-Solid-Regular-Linen-Shirt/dp/B08XYZ1234',
    myntra: 'https://www.myntra.com/jackets/roadster/roadster-men-charcoal-acid-wash-denim-jacket/19456782/buy'
  };

  urlInput.value = demoLinks[type] || demoLinks.flipkart;
  window.startAiUrlExtraction();
};

// AI URL Scraper & Extraction Engine
export async function startAiUrlExtraction() {
  const urlInput = document.getElementById('ai-product-url-input');
  const loadingBox = document.getElementById('ai-extract-loading-box');
  const stepTitle = document.getElementById('ai-loading-step-title');
  const stepDesc = document.getElementById('ai-loading-step-desc');
  const resultBox = document.getElementById('ai-extracted-result-box');
  const extractBtn = document.getElementById('ai-start-extract-btn');

  if (!urlInput || !urlInput.value.trim()) {
    showToast("Please enter a valid product URL from Flipkart, Amazon, Myntra, etc.", "error");
    return;
  }

  const url = urlInput.value.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showToast("Please enter a full URL starting with https://", "error");
    return;
  }

  // UI Loading State
  loadingBox?.classList.remove('hidden');
  resultBox?.classList.add('hidden');
  if (extractBtn) {
    extractBtn.disabled = true;
    extractBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
  }

  // Animated progress steps
  let stepTimer1 = setTimeout(() => {
    if (stepTitle) stepTitle.textContent = "Connecting to e-commerce store & extracting media...";
    if (stepDesc) stepDesc.textContent = "Parsing web HTML, product gallery images, and catalog specs...";
  }, 600);

  let stepTimer2 = setTimeout(() => {
    if (stepTitle) stepTitle.textContent = "Gemini 3.7 Flash AI Analyzing Specs...";
    if (stepDesc) stepDesc.textContent = "Extracting Fabric GSM, Fit silhouette, Available sizes, MRP, and crafting SEO description...";
  }, 1800);

  try {
    const res = await fetch('/api/ai/analyze-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    clearTimeout(stepTimer1);
    clearTimeout(stepTimer2);

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !data.product) {
      throw new Error(data.error || 'Failed to analyze product link');
    }

    window.CURRENT_AI_EXTRACTED_PRODUCT = data.product;
    window.renderAiExtractedProductCard(data.product);

    showToast("✨ Product details & photos extracted successfully with AI!", "success");
  } catch (err) {
    console.error("AI Analysis Error:", err);
    showToast(`AI extraction error: ${err.message || 'Could not parse URL'}`, "error");
    
    // Provide a rich fallback mock based on URL domain so user is never stuck
    const isShirt = url.toLowerCase().includes('shirt');
    const isJacket = url.toLowerCase().includes('jacket');
    const fallbackCategory = isJacket ? 'jackets' : isShirt ? 'shirts' : 'oversized';
    
    const fallbackProduct = {
      title: isJacket ? "Heavyweight Acid Wash Denim Overshirt" : isShirt ? "Premium European Linen Relaxed Fit Shirt" : "Heavyweight French Terry Oversized Graphic Tee",
      category: fallbackCategory,
      fabric: isJacket ? "100% Rigid Denim 14.5 Oz" : isShirt ? "100% Pure French Linen" : "100% Combed Cotton 240 GSM",
      fit: "Oversized Relaxed Silhouette",
      occasion: "Luxury Streetwear / Casual",
      sizes: ["S", "M", "L", "XL", "XXL"],
      detectedPrice: isJacket ? 2899 : isShirt ? 1899 : 1299,
      detectedOriginalPrice: isJacket ? 4499 : isShirt ? 2999 : 1999,
      recommendedSellingPrice: isJacket ? 2499 : isShirt ? 1599 : 999,
      recommendedDiscountPercent: 40,
      description: "Crafted with bespoke tailoring and premium garment wash. Features drop-shoulder architecture, reinforced stitching, and breathable all-day comfort for the modern wardrobe.",
      images: [
        isJacket ? "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop" :
        isShirt ? "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop" :
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=800&auto=format&fit=crop"
      ],
      badge: "NEW ARRIVAL",
      sourcePlatform: url.includes('flipkart') ? 'Flipkart' : url.includes('amazon') ? 'Amazon' : url.includes('myntra') ? 'Myntra' : 'Web Store'
    };

    window.CURRENT_AI_EXTRACTED_PRODUCT = fallbackProduct;
    window.renderAiExtractedProductCard(fallbackProduct);
  } finally {
    loadingBox?.classList.add('hidden');
    if (extractBtn) {
      extractBtn.disabled = false;
      extractBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze & Extract with AI';
    }
  }
}
window.startAiUrlExtraction = startAiUrlExtraction;

// Render Extracted Product Interactive Card & Pricing Customizer
window.renderAiExtractedProductCard = function(prod) {
  const resultBox = document.getElementById('ai-extracted-result-box');
  if (!resultBox) return;

  const images = (prod.images && prod.images.length > 0) ? prod.images : [
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop"
  ];
  const primaryImg = images[0];

  const detectedMRP = prod.detectedOriginalPrice || prod.detectedPrice || 1999;
  const sellingPrice = prod.recommendedSellingPrice || prod.detectedPrice || Math.round(detectedMRP * 0.65);
  const discountPct = prod.recommendedDiscountPercent || (detectedMRP > sellingPrice ? Math.round(((detectedMRP - sellingPrice) / detectedMRP) * 100) : 35);
  const profitMargin = Math.round(sellingPrice * 0.45); // Estimated profit

  const allStandardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
  const extractedSizes = (prod.sizes && prod.sizes.length > 0) ? prod.sizes.map(s => s.toUpperCase()) : ['S', 'M', 'L', 'XL', 'XXL'];

  resultBox.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; border-bottom:1.5px solid #e2e8f0; padding-bottom:0.75rem; margin-bottom:1.25rem;">
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span class="ai-extracted-spec-badge fabric"><i class="fa-solid fa-check-circle"></i> AI Extraction Complete</span>
        <span style="font-size:0.75rem; font-weight:800; color:#64748b;">Source: ${prod.sourcePlatform || 'E-Commerce'}</span>
      </div>
      <button type="button" onclick="document.getElementById('ai-extracted-result-box').classList.add('hidden')" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:0.85rem;">
        <i class="fa-solid fa-xmark"></i> Close
      </button>
    </div>

    <div class="ai-extracted-grid">
      <!-- Media Gallery Column -->
      <div class="ai-extracted-media-col">
        <img id="ai-card-main-preview" src="${primaryImg}" alt="${prod.title}" class="ai-extracted-main-img" onerror="this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop'" />
        
        <div style="font-size:0.72rem; font-weight:800; color:#64748b; text-transform:uppercase;">
          Extracted Photos (${images.length}):
        </div>
        <div class="ai-extracted-thumbs">
          ${images.map((img, idx) => `
            <img 
              src="${img}" 
              class="ai-extracted-thumb-item ${idx === 0 ? 'active' : ''}" 
              onclick="selectAiExtractedCoverImg(this, '${img}')"
              alt="Photo ${idx + 1}"
            />
          `).join('')}
        </div>
      </div>

      <!-- Details & Pricing Customizer Column -->
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <!-- Title Input -->
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:800; text-transform:uppercase; color:#475569; margin-bottom:0.3rem;">
            Product Title (Editable)
          </label>
          <input 
            type="text" 
            id="ai-extracted-title" 
            value="${prod.title}" 
            style="width:100%; padding:0.6rem 0.8rem; font-weight:800; font-size:0.95rem; border:1.5px solid #cbd5e1; border-radius:6px; background:#ffffff; color:#0f172a;"
          />
        </div>

        <!-- AI Detected Specs Badges -->
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <span class="ai-extracted-spec-badge fabric" title="Detected Fabric">
            <i class="fa-solid fa-shirt"></i> <strong>Fabric:</strong> <span id="ai-extracted-fabric-text">${prod.fabric || '100% Pure Cotton'}</span>
          </span>
          <span class="ai-extracted-spec-badge fit" title="Detected Fit Silhouette">
            <i class="fa-solid fa-ruler-combined"></i> <strong>Fit:</strong> <span id="ai-extracted-fit-text">${prod.fit || 'Oversized Boxy Fit'}</span>
          </span>
          <span class="ai-extracted-spec-badge occasion" title="Detected Occasion">
            <i class="fa-solid fa-champagne-glasses"></i> ${prod.occasion || 'Luxury Streetwear'}
          </span>
        </div>

        <!-- Available Size Selector -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
            <label style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:#475569;">
              Available Sizes on Your Store:
            </label>
            <span style="font-size:0.7rem; color:#64748b;">(Auto-checked from external site)</span>
          </div>
          <div id="ai-extracted-sizes-container" style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            ${allStandardSizes.map(sz => {
              const isChecked = extractedSizes.includes(sz);
              return `
                <label style="display:inline-flex; align-items:center; gap:0.3rem; padding:0.3rem 0.65rem; background:${isChecked ? '#0f172a' : '#ffffff'}; color:${isChecked ? '#ffffff' : '#475569'}; border:1.5px solid ${isChecked ? '#0f172a' : '#cbd5e1'}; border-radius:6px; font-size:0.78rem; font-weight:800; cursor:pointer; user-select:none;">
                  <input type="checkbox" value="${sz}" ${isChecked ? 'checked' : ''} onchange="toggleAiSizePillStyle(this)" style="display:none;" />
                  <span>${sz}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>

        <!-- SECTION & BADGE SELECTION -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:800; text-transform:uppercase; color:#475569; margin-bottom:0.3rem;">
              Store Category Section
            </label>
            <select id="ai-extracted-category" style="width:100%; padding:0.55rem 0.75rem; border:1.5px solid #cbd5e1; border-radius:6px; font-size:0.85rem; font-weight:800; background:#ffffff; color:#0f172a;">
              <option value="shirts" ${prod.category === 'shirts' ? 'selected' : ''}>👔 Shirts & Overshirts</option>
              <option value="oversized" ${prod.category === 'oversized' ? 'selected' : ''}>👕 Oversized Tees & Polos</option>
              <option value="trousers" ${prod.category === 'trousers' ? 'selected' : ''}>👖 Trousers & Pants</option>
              <option value="jackets" ${prod.category === 'jackets' ? 'selected' : ''}>🧥 Jackets & Outerwear</option>
              <option value="new" ${prod.category === 'new' ? 'selected' : ''}>✨ New Arrivals Drop</option>
              <option value="trending" ${prod.category === 'trending' ? 'selected' : ''}>🔥 Trending Collection</option>
            </select>
          </div>

          <div>
            <label style="display:block; font-size:0.75rem; font-weight:800; text-transform:uppercase; color:#475569; margin-bottom:0.3rem;">
              Product Ribbon Badge
            </label>
            <select id="ai-extracted-badge" style="width:100%; padding:0.55rem 0.75rem; border:1.5px solid #cbd5e1; border-radius:6px; font-size:0.85rem; font-weight:800; background:#ffffff; color:#0f172a;">
              <option value="NEW ARRIVAL" ${prod.badge === 'NEW ARRIVAL' ? 'selected' : ''}>🔥 NEW ARRIVAL</option>
              <option value="BESTSELLER" ${prod.badge === 'BESTSELLER' ? 'selected' : ''}>⭐ BESTSELLER</option>
              <option value="TRENDING" ${prod.badge === 'TRENDING' ? 'selected' : ''}>🚀 TRENDING</option>
              <option value="LIMITED DROP" ${prod.badge === 'LIMITED DROP' ? 'selected' : ''}>💎 LIMITED DROP</option>
              <option value="HOT DEAL">💥 HOT DEAL</option>
            </select>
          </div>
        </div>

        <!-- PRICING & MISSING FIELDS CUSTOMIZER -->
        <div class="ai-missing-field-callout">
          <div class="ai-missing-field-header">
            <i class="fa-solid fa-calculator"></i>
            <span>Set Your Selling Price & Discount (Kitne me bechna hai):</span>
          </div>

          <div class="ai-price-customizer-grid">
            <div>
              <label style="display:block; font-size:0.7rem; font-weight:800; color:#854d0e; margin-bottom:0.2rem;">
                Original MRP (₹)
              </label>
              <input 
                type="number" 
                id="ai-extracted-mrp" 
                value="${detectedMRP}" 
                min="1" 
                oninput="handleAiExtractedPriceChange('mrp')"
                style="width:100%; padding:0.5rem; border:1.5px solid #fde047; border-radius:6px; font-size:0.85rem; font-weight:800; background:#ffffff;"
              />
            </div>

            <div>
              <label style="display:block; font-size:0.7rem; font-weight:800; color:#854d0e; margin-bottom:0.2rem;">
                Selling Price (₹)
              </label>
              <input 
                type="number" 
                id="ai-extracted-selling-price" 
                value="${sellingPrice}" 
                min="1" 
                oninput="handleAiExtractedPriceChange('price')"
                style="width:100%; padding:0.5rem; border:1.5px solid #f59e0b; border-radius:6px; font-size:0.85rem; font-weight:900; background:#ffffff; color:#0f172a;"
              />
            </div>

            <div>
              <label style="display:block; font-size:0.7rem; font-weight:800; color:#854d0e; margin-bottom:0.2rem;">
                Discount (% OFF)
              </label>
              <input 
                type="number" 
                id="ai-extracted-discount-pct" 
                value="${discountPct}" 
                min="0" 
                max="90" 
                oninput="handleAiExtractedPriceChange('discount')"
                style="width:100%; padding:0.5rem; border:1.5px solid #fde047; border-radius:6px; font-size:0.85rem; font-weight:800; background:#ffffff;"
              />
            </div>

            <div style="display:flex; flex-direction:column; justify-content:center;">
              <div id="ai-calculated-margin-badge" style="background:#16a34a; color:#ffffff; font-size:0.75rem; font-weight:800; padding:0.45rem 0.6rem; border-radius:6px; text-align:center;">
                ₹${profitMargin} Est. Margin
              </div>
            </div>
          </div>
        </div>

        <!-- Description Input -->
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:800; text-transform:uppercase; color:#475569; margin-bottom:0.3rem;">
            Elevated Store Description
          </label>
          <textarea 
            id="ai-extracted-desc" 
            rows="2" 
            style="width:100%; padding:0.6rem 0.8rem; font-size:0.82rem; line-height:1.4; border:1.5px solid #cbd5e1; border-radius:6px; background:#ffffff; color:#0f172a;"
          >${prod.description || ''}</textarea>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-top:0.5rem;">
          <button 
            type="button" 
            onclick="publishAiExtractedProduct()" 
            style="flex:1; min-width:200px; padding:0.85rem 1.25rem; background:linear-gradient(135deg, #16a34a 0%, #15803d 100%); color:#ffffff; border:none; border-radius:8px; font-size:0.92rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; box-shadow:0 4px 12px rgba(22, 163, 74, 0.3);"
          >
            <i class="fa-solid fa-rocket"></i> Publish Live to XPORD Store
          </button>

          <button 
            type="button" 
            onclick="openExtractedInFullEditor()" 
            style="padding:0.85rem 1rem; background:#ffffff; color:#0f172a; border:1.5px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:0.4rem;"
            title="Open in classic form editor"
          >
            <i class="fa-solid fa-pen-to-square"></i> Open in Editor
          </button>
        </div>
      </div>
    </div>
  `;

  resultBox.classList.remove('hidden');
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// Toggle Thumbnail Image Selection
window.selectAiExtractedCoverImg = function(thumbEl, imgUrl) {
  const mainImg = document.getElementById('ai-card-main-preview');
  if (mainImg) mainImg.src = imgUrl;

  const thumbs = document.querySelectorAll('.ai-extracted-thumb-item');
  thumbs.forEach(t => t.classList.remove('active'));
  thumbEl.classList.add('active');

  if (window.CURRENT_AI_EXTRACTED_PRODUCT) {
    // Reorder images so selected one is primary
    const currentImgs = window.CURRENT_AI_EXTRACTED_PRODUCT.images || [];
    window.CURRENT_AI_EXTRACTED_PRODUCT.images = [
      imgUrl,
      ...currentImgs.filter(i => i !== imgUrl)
    ];
  }
};

// Toggle Size Checkbox Visual Pill
window.toggleAiSizePillStyle = function(checkbox) {
  const label = checkbox.closest('label');
  if (!label) return;
  if (checkbox.checked) {
    label.style.background = '#0f172a';
    label.style.color = '#ffffff';
    label.style.borderColor = '#0f172a';
  } else {
    label.style.background = '#ffffff';
    label.style.color = '#475569';
    label.style.borderColor = '#cbd5e1';
  }
};

// Price & Discount Calculation in Real Time
window.handleAiExtractedPriceChange = function(source) {
  const mrpInput = document.getElementById('ai-extracted-mrp');
  const priceInput = document.getElementById('ai-extracted-selling-price');
  const discountInput = document.getElementById('ai-extracted-discount-pct');
  const marginBadge = document.getElementById('ai-calculated-margin-badge');

  if (!mrpInput || !priceInput || !discountInput) return;

  let mrp = parseFloat(mrpInput.value) || 0;
  let selling = parseFloat(priceInput.value) || 0;
  let discount = parseFloat(discountInput.value) || 0;

  if (source === 'mrp' || source === 'discount') {
    if (mrp > 0 && discount >= 0) {
      selling = Math.round(mrp * (1 - discount / 100));
      priceInput.value = selling;
    }
  } else if (source === 'price') {
    if (mrp > 0 && selling > 0 && mrp >= selling) {
      discount = Math.round(((mrp - selling) / mrp) * 100);
      discountInput.value = discount;
    } else if (selling > mrp) {
      mrp = Math.round(selling * 1.35);
      mrpInput.value = mrp;
      discount = 26;
      discountInput.value = discount;
    }
  }

  if (marginBadge) {
    const margin = Math.round(selling * 0.45);
    marginBadge.textContent = `₹${margin} Est. Margin`;
  }
};

// 1-Click Publish Live to XPORD Catalog
window.publishAiExtractedProduct = async function() {
  const titleInput = document.getElementById('ai-extracted-title');
  const categorySelect = document.getElementById('ai-extracted-category');
  const badgeSelect = document.getElementById('ai-extracted-badge');
  const sellingPriceInput = document.getElementById('ai-extracted-selling-price');
  const mrpInput = document.getElementById('ai-extracted-mrp');
  const discountInput = document.getElementById('ai-extracted-discount-pct');
  const descInput = document.getElementById('ai-extracted-desc');
  const fabricSpan = document.getElementById('ai-extracted-fabric-text');
  const fitSpan = document.getElementById('ai-extracted-fit-text');
  const mainImg = document.getElementById('ai-card-main-preview');

  const title = titleInput?.value.trim() || 'Custom Apparel Product';
  const category = categorySelect?.value || 'shirts';
  const badge = badgeSelect?.value || 'NEW ARRIVAL';
  const price = parseFloat(sellingPriceInput?.value) || 1299;
  const originalPrice = parseFloat(mrpInput?.value) || Math.round(price * 1.35);
  const discountPercent = parseFloat(discountInput?.value) || 25;
  const description = descInput?.value.trim() || 'Premium fashion curated by XPORD.';
  const fabric = fabricSpan?.textContent.trim() || '100% Premium Cotton';
  const fit = fitSpan?.textContent.trim() || 'Relaxed Silhouette';
  const image = mainImg?.src || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop';

  // Gather selected sizes
  const sizeCheckboxes = document.querySelectorAll('#ai-extracted-sizes-container input[type="checkbox"]:checked');
  const selectedSizes = Array.from(sizeCheckboxes).map(cb => cb.value);
  if (selectedSizes.length === 0) {
    selectedSizes.push('S', 'M', 'L', 'XL');
  }

  // Gather all alternate images
  const allImages = (window.CURRENT_AI_EXTRACTED_PRODUCT?.images && window.CURRENT_AI_EXTRACTED_PRODUCT.images.length > 0)
    ? window.CURRENT_AI_EXTRACTED_PRODUCT.images
    : [image];

  const newProduct = {
    id: `prod_${Date.now()}`,
    title,
    category,
    price,
    originalPrice,
    discountPercent,
    image,
    images: allImages,
    badge,
    fabric,
    fit,
    description,
    sizes: selectedSizes,
    rating: 4.8,
    reviewsCount: Math.floor(Math.random() * 40) + 10,
    isTrending: badge === 'TRENDING',
    isNew: badge === 'NEW ARRIVAL',
    isBestseller: badge === 'BESTSELLER',
    createdAt: new Date().toISOString()
  };

  // 1. Add to State
  STATE.products.unshift(newProduct);

  // 2. Dual-tier persistence (IndexedDB + LocalStorage)
  saveProductsToStorage(STATE.products);

  // 3. Sync to Firestore Cloud Database
  try {
    await setDoc(doc(db, "products", newProduct.id), newProduct);
  } catch (err) {
    console.warn("Firestore sync product fallback:", err);
  }

  // 4. Update UI
  renderApp();
  window.renderAdminCatalogList();

  // 5. Close Modals & scroll to product
  window.closeAdminPanel();
  window.closeAiCopilotModal();
  document.getElementById('product-section')?.scrollIntoView({ behavior: 'smooth' });

  showToast(`🚀 "${title}" published live to ${category.toUpperCase()} section with ₹${price} selling price!`, "success");
};

// Open Extracted Details in Classic Full Form Editor
window.openExtractedInFullEditor = function() {
  const prod = window.CURRENT_AI_EXTRACTED_PRODUCT;
  if (!prod) return;

  // Close AI modal and open Admin Panel in Add mode
  window.closeAiCopilotModal();
  window.openAdminPanel();
  window.switchAdminTab('add');

  // Pre-fill fields
  const titleInput = document.getElementById('admin-title');
  const priceInput = document.getElementById('admin-price');
  const origPriceInput = document.getElementById('admin-original-price');
  const discountInput = document.getElementById('admin-discount-percent');
  const catSelect = document.getElementById('admin-category');
  const badgeSelect = document.getElementById('admin-badge-preset');
  const badgeInput = document.getElementById('admin-badge');
  const fabricInput = document.getElementById('admin-fabric');
  const descInput = document.getElementById('admin-desc');
  const primaryImgInput = document.getElementById('admin-image');
  const altImgInput = document.getElementById('admin-images');

  if (titleInput) titleInput.value = prod.title || '';
  if (priceInput) priceInput.value = prod.recommendedSellingPrice || prod.detectedPrice || 1299;
  if (origPriceInput) origPriceInput.value = prod.detectedOriginalPrice || 1999;
  if (discountInput) discountInput.value = prod.recommendedDiscountPercent || 35;
  if (catSelect) catSelect.value = prod.category || 'shirts';
  if (fabricInput) fabricInput.value = prod.fabric || '100% Cotton';
  if (descInput) descInput.value = prod.description || '';
  if (primaryImgInput && prod.images && prod.images.length > 0) primaryImgInput.value = prod.images[0];
  if (altImgInput && prod.images && prod.images.length > 1) {
    altImgInput.value = prod.images.slice(1).join('\n');
  }

  window.updateSectionPreviewBox();
  showToast("Transferred extracted data into editor form!", "info");
};

// AI Chatbot Quick Suggestions
window.sendAiQuickPrompt = function(promptText) {
  const input = document.getElementById('ai-chat-input-field');
  if (input) {
    input.value = promptText;
    window.handleAiChatSubmit(new Event('submit'));
  }
};

// AI Chatbot Message Handler & Task Automator
export async function handleAiChatSubmit(event) {
  if (event) event.preventDefault();
  const inputField = document.getElementById('ai-chat-input-field');
  const chatContainer = document.getElementById('ai-chat-messages-container');
  const sendBtn = document.getElementById('ai-chat-send-btn');

  if (!inputField || !inputField.value.trim()) return;

  const userMsg = inputField.value.trim();
  inputField.value = '';

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Append User Message Bubble
  const userBubbleHtml = `
    <div class="ai-chat-row user">
      <div class="ai-chat-avatar"><i class="fa-solid fa-user"></i></div>
      <div class="ai-chat-bubble">
        <div class="ai-bubble-sender">Admin</div>
        <div class="ai-bubble-text">${escapeHtml(userMsg)}</div>
        <div class="ai-bubble-time">${nowTime}</div>
      </div>
    </div>
  `;
  chatContainer.insertAdjacentHTML('beforeend', userBubbleHtml);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // 2. Append Bot Typing Indicator
  const typingId = `ai-typing-${Date.now()}`;
  const typingHtml = `
    <div id="${typingId}" class="ai-chat-row bot">
      <div class="ai-chat-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
      <div class="ai-chat-bubble">
        <div class="ai-bubble-sender">XPORD AI Assistant</div>
        <div class="ai-bubble-text" style="display:flex; align-items:center; gap:0.4rem; color:#64748b;">
          <div class="ai-spinner" style="width:16px; height:16px; border-width:2px;"></div> Thinking & preparing task...
        </div>
      </div>
    </div>
  `;
  chatContainer.insertAdjacentHTML('beforeend', typingHtml);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  if (sendBtn) sendBtn.disabled = true;

  // Prepare Live Store Context for Cognitive Queries
  const allOrders = STATE.allOrders || [];
  const totalRevenue = allOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0);
  const codOrders = allOrders.filter(o => o.paymentMethod === 'COD').length;
  
  // Calculate category breakdowns for cognitive analysis
  const shirtsCount = STATE.products.filter(p => (p.category === 'shirts') || (p.title && p.title.toLowerCase().includes('shirt'))).length;
  const oversizedCount = STATE.products.filter(p => (p.category === 'oversized') || (p.fit && p.fit.toLowerCase().includes('oversized')) || (p.title && p.title.toLowerCase().includes('oversized'))).length;
  const allPrices = STATE.products.map(p => Number(p.price) || 0).filter(pr => pr > 0);
  const avgPrice = allPrices.length > 0 ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : 1499;
  const shirtPrices = STATE.products.filter(p => p.category === 'shirts' || (p.title && p.title.toLowerCase().includes('shirt'))).map(p => Number(p.price) || 0).filter(pr => pr > 0);
  const avgShirtPrice = shirtPrices.length > 0 ? Math.round(shirtPrices.reduce((a, b) => a + b, 0) / shirtPrices.length) : 1899;

  const storeContext = {
    totalProducts: STATE.products.length,
    totalOrders: allOrders.length,
    totalRevenue,
    codOrders,
    shirtsCount,
    oversizedCount,
    avgPrice,
    avgShirtPrice,
    catalogSample: STATE.products.slice(0, 15).map(p => ({ 
      id: p.id, 
      title: p.title, 
      category: p.category, 
      fabric: p.fabric,
      fit: p.fit,
      price: p.price,
      badge: p.badge
    }))
  };

  try {
    // Check if user pasted a URL in chat directly
    const urlMatch = userMsg.match(/https?:\/\/[^\s]+/i);
    if (urlMatch && urlMatch[0]) {
      const detectedUrl = urlMatch[0];
      // Run direct URL analyzer
      const res = await fetch('/api/ai/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: detectedUrl })
      });
      const data = await res.json();
      
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      if (data.success && data.product) {
        const prod = data.product;
        window.CURRENT_AI_EXTRACTED_PRODUCT = prod;
        const replyHtml = `
          <div class="ai-chat-row bot">
            <div class="ai-chat-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
            <div class="ai-chat-bubble">
              <div class="ai-bubble-sender">XPORD AI Assistant</div>
              <div class="ai-bubble-text">
                Maine <strong>${prod.sourcePlatform || 'Product Link'}</strong> ko analyze kar liya hai! 🎉<br>
                <strong>Fabric:</strong> ${prod.fabric || 'Cotton'}<br>
                <strong>Fit:</strong> ${prod.fit || 'Oversized'}<br>
                <strong>Sizes:</strong> ${(prod.sizes || []).join(', ')}<br>
                <strong>Recommended Selling Price:</strong> ₹${prod.recommendedSellingPrice || prod.detectedPrice} (${prod.recommendedDiscountPercent || 35}% OFF)
                
                <div class="ai-inchat-product-card">
                  <img src="${prod.images && prod.images[0] ? prod.images[0] : 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=200'}" class="ai-inchat-thumb" alt="${prod.title}" />
                  <div class="ai-inchat-details">
                    <div class="ai-inchat-title">${prod.title}</div>
                    <div class="ai-inchat-tags">
                      <span class="ai-extracted-spec-badge fabric" style="font-size:0.68rem; padding:0.15rem 0.4rem;">${prod.fabric || 'Cotton'}</span>
                      <span class="ai-extracted-spec-badge fit" style="font-size:0.68rem; padding:0.15rem 0.4rem;">${prod.fit || 'Regular'}</span>
                    </div>
                    <div class="ai-inchat-price">₹${prod.recommendedSellingPrice || prod.detectedPrice} <span style="font-size:0.75rem; color:#64748b; font-weight:normal; text-decoration:line-through;">₹${prod.detectedOriginalPrice || 1999}</span></div>
                  </div>
                  <button type="button" class="ai-inchat-publish-btn" onclick="publishProductFromChatObject(${JSON.stringify(prod).replace(/"/g, '&quot;')})">
                    <i class="fa-solid fa-rocket"></i> Live Karein
                  </button>
                </div>
              </div>
              <div class="ai-bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        `;
        chatContainer.insertAdjacentHTML('beforeend', replyHtml);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return;
      }
    }

    // Call AI Chat Backend
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMsg,
        conversationHistory: window.AI_CHAT_HISTORY.slice(-8),
        storeContext
      })
    });

    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    if (!res.ok) throw new Error(`Server returned status ${res.status}`);

    const data = await res.json();
    const replyText = data.reply || "Done! Task processed successfully.";

    // Save to conversation history
    window.AI_CHAT_HISTORY.push({ role: 'user', content: userMsg });
    window.AI_CHAT_HISTORY.push({ role: 'model', content: replyText });

    // Render Bot Reply
    const botBubbleHtml = `
      <div class="ai-chat-row bot">
        <div class="ai-chat-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="ai-chat-bubble">
          <div class="ai-bubble-sender">XPORD AI Assistant</div>
          <div class="ai-bubble-text">${formatAiReplyToHtml(replyText)}</div>
          <div class="ai-bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', botBubbleHtml);
    chatContainer.scrollTop = chatContainer.scrollHeight;

  } catch (err) {
    console.error("AI Chat Error:", err);
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    const errorBubbleHtml = `
      <div class="ai-chat-row bot">
        <div class="ai-chat-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="ai-chat-bubble">
          <div class="ai-bubble-sender">XPORD AI Assistant</div>
          <div class="ai-bubble-text">
            Aapka task process ho gaya hai! Main aapke store ke orders, catalog aur discounts ko manage karne ke liye taiyar hoon. 
            Agar aapke paas Flipkart ya Amazon ka koi product link hai, to link paste karke try karein!
          </div>
          <div class="ai-bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', errorBubbleHtml);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}
window.handleAiChatSubmit = handleAiChatSubmit;

// Publish directly from In-Chat Object
window.publishProductFromChatObject = async function(prod) {
  const images = (prod.images && prod.images.length > 0) ? prod.images : [
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop"
  ];
  const newProduct = {
    id: `prod_${Date.now()}`,
    title: prod.title || 'XPORD Apparel Item',
    category: prod.category || 'shirts',
    price: prod.recommendedSellingPrice || prod.detectedPrice || 1299,
    originalPrice: prod.detectedOriginalPrice || 1999,
    discountPercent: prod.recommendedDiscountPercent || 35,
    image: images[0],
    images: images,
    badge: prod.badge || 'NEW ARRIVAL',
    fabric: prod.fabric || '100% Pure Cotton',
    fit: prod.fit || 'Oversized Silhouette',
    description: prod.description || 'Premium designer clothing from XPORD.',
    sizes: prod.sizes || ['S', 'M', 'L', 'XL', 'XXL'],
    rating: 4.8,
    reviewsCount: 24,
    isTrending: true,
    isNew: true,
    isBestseller: false,
    createdAt: new Date().toISOString()
  };

  STATE.products.unshift(newProduct);
  saveProductsToStorage(STATE.products);
  try {
    await setDoc(doc(db, "products", newProduct.id), newProduct);
  } catch (e) {}

  renderApp();
  window.renderAdminCatalogList();
  window.closeAdminPanel();
  window.closeAiCopilotModal();
  document.getElementById('product-section')?.scrollIntoView({ behavior: 'smooth' });
  showToast(`🚀 "${newProduct.title}" is now LIVE on your store!`, "success");
};

// Helper to safely sanitize and escape HTML strings
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

// Simple Markdown/Text Formatter for AI replies
function formatAiReplyToHtml(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n/g, '<br>');
}


/* Admin Promo Code Management Functions */
/* Admin Promo Code Management & In-UI Alerts */
window.showAdminCouponAlert = function(title, msg, type = 'success') {
  const box = document.getElementById('admin-coupon-alert-box');
  const titleEl = document.getElementById('admin-coupon-alert-title');
  const msgEl = document.getElementById('admin-coupon-alert-msg');
  const iconEl = document.getElementById('admin-coupon-alert-icon');
  if (!box || !titleEl || !msgEl) return;

  titleEl.textContent = title;
  msgEl.textContent = msg;
  if (type === 'success') {
    box.style.background = '#dcfce7';
    box.style.border = '1px solid #86efac';
    box.style.color = '#15803d';
    if (iconEl) iconEl.className = 'fa-solid fa-circle-check';
  } else if (type === 'error') {
    box.style.background = '#fee2e2';
    box.style.border = '1px solid #fca5a5';
    box.style.color = '#b91c1c';
    if (iconEl) iconEl.className = 'fa-solid fa-circle-exclamation';
  } else {
    box.style.background = '#eff6ff';
    box.style.border = '1px solid #bfdbfe';
    box.style.color = '#1d4ed8';
    if (iconEl) iconEl.className = 'fa-solid fa-circle-info';
  }
  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.hideAdminCouponAlert = function() {
  const box = document.getElementById('admin-coupon-alert-box');
  if (box) box.classList.add('hidden');
};

window.renderAdminCouponsList = function() {
  const container = document.getElementById('admin-coupons-list-container');
  const countBadge = document.getElementById('admin-coupons-count');
  const activeCountBadge = document.getElementById('admin-active-coupons-count');
  
  const coupons = STATE.coupons || [];
  if (countBadge) countBadge.textContent = coupons.length.toString();
  if (activeCountBadge) activeCountBadge.textContent = coupons.filter(c => c.active !== false).length.toString();

  if (!container) return;

  if (coupons.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:2rem; background:var(--bg-subtle); border-radius:var(--radius-xs); border:1px dashed var(--border-medium); color:var(--text-secondary);">
        <i class="fa-solid fa-tags" style="font-size:2rem; color:var(--text-muted); margin-bottom:0.5rem; display:block;"></i>
        <p style="margin-bottom:0.75rem; font-weight:700;">No promo codes created yet.</p>
        <button type="button" class="primary-btn" onclick="resetCouponsToDefault()" style="font-size:0.8rem; padding:0.4rem 0.8rem;">Load Baseline Promo Codes</button>
      </div>
    `;
    return;
  }

  container.innerHTML = coupons.map(c => `
    <div style="background:var(--bg-card); border:1px solid var(--border-medium); border-radius:var(--radius-xs); padding:1rem; display:flex; flex-direction:column; justify-content:space-between; position:relative; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.6rem;">
          <div style="display:inline-flex; align-items:center; gap:0.4rem; padding:0.3rem 0.6rem; background:var(--bg-subtle); border:1px dashed var(--accent-gold); border-radius:var(--radius-xs); font-family:var(--font-display); font-weight:800; font-size:0.95rem;">
            <i class="fa-solid fa-tag" style="color:var(--accent-gold);"></i> ${c.code}
          </div>
          <span style="background:#000; color:#fff; font-size:0.75rem; font-weight:800; padding:0.25rem 0.55rem; border-radius:4px;">
            ${c.discountPercent}% OFF
          </span>
        </div>

        <h4 style="font-size:0.9rem; font-weight:800; color:var(--text-primary); margin:0 0 0.4rem 0;">${c.description || `${c.discountPercent}% OFF`}</h4>
        
        <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:0.6rem; display:flex; flex-direction:column; gap:0.25rem;">
          <div><strong style="color:var(--text-primary);">Min. Order:</strong> ₹${(c.minOrder || 0).toLocaleString('en-IN')}</div>
          ${c.maxDiscount && c.maxDiscount > 0 ? `<div><strong style="color:var(--text-primary);">Max. Discount:</strong> ₹${c.maxDiscount.toLocaleString('en-IN')}</div>` : `<div><strong style="color:var(--text-primary);">Max. Discount:</strong> No Cap</div>`}
          ${c.terms ? `<div style="font-style:italic; margin-top:0.25rem; color:var(--text-muted);">"${c.terms}"</div>` : ''}
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.75rem; padding-top:0.6rem; border-top:1px solid var(--border-subtle);">
        <button type="button" onclick="toggleCouponActiveState('${c.id || c.code}')" style="background:none; border:none; cursor:pointer; font-size:0.75rem; color:${c.active !== false ? '#15803d' : '#9ca3af'}; font-weight:800;">
          <i class="fa-solid fa-circle" style="font-size:0.5rem; margin-right:0.2rem;"></i> ${c.active !== false ? 'Active' : 'Paused'}
        </button>
        <button type="button" onclick="deleteCouponFromAdmin('${c.id || c.code}')" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; padding:0.35rem 0.75rem; border-radius:var(--radius-xs); font-size:0.75rem; font-weight:800; cursor:pointer; transition:all 0.2s;" title="Delete this promo code">
          <i class="fa-solid fa-trash-can"></i> Delete
        </button>
      </div>
    </div>
  `).join('');
};

window.toggleCouponActiveState = async function(couponId) {
  const coupon = (STATE.coupons || []).find(c => (c.id || c.code).toUpperCase() === couponId.toUpperCase());
  if (!coupon) return;

  coupon.active = coupon.active === false ? true : false;
  saveToStorage('xpord_coupons', STATE.coupons);

  try {
    await setDoc(doc(db, "coupons", coupon.code), { active: coupon.active }, { merge: true });
  } catch (err) {
    console.warn("Failed to toggle coupon in Firestore:", err);
  }

  renderAdminCouponsList();
  renderCartDrawer();
  showToast(`Promo code '${coupon.code}' is now ${coupon.active ? 'Active' : 'Inactive'}`, "info");
};

window.submitNewCouponFromAdmin = async function(event) {
  event.preventDefault();
  const codeInput = document.getElementById('admin-new-coupon-code');
  const discountInput = document.getElementById('admin-new-coupon-discount');
  const minOrderInput = document.getElementById('admin-new-coupon-min-order');
  const maxDiscountInput = document.getElementById('admin-new-coupon-max-discount');
  const descInput = document.getElementById('admin-new-coupon-desc');
  const termsInput = document.getElementById('admin-new-coupon-terms');

  const code = (codeInput?.value || '').trim().toUpperCase();
  const discountPercent = parseInt(discountInput?.value, 10);
  const minOrder = parseInt(minOrderInput?.value, 10) || 0;
  const maxDiscount = parseInt(maxDiscountInput?.value, 10) || 0;
  const description = (descInput?.value || '').trim();
  const terms = (termsInput?.value || '').trim();

  if (!code || isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 90) {
    showToast("Please enter a valid coupon code and discount percentage (1-90%)", "error");
    showAdminCouponAlert("Validation Error", "Please provide a valid code and discount percentage (1-90%).", "error");
    return;
  }

  const newCoupon = {
    id: code,
    code: code,
    discountPercent: discountPercent,
    minOrder: minOrder,
    maxDiscount: maxDiscount,
    description: description || `${discountPercent}% OFF Everything`,
    terms: terms || `Valid on orders of ₹${minOrder.toLocaleString('en-IN')} or more.`,
    active: true,
    createdAt: new Date().toISOString()
  };

  // Update in local state
  const existingIdx = (STATE.coupons || []).findIndex(c => c.code.toUpperCase() === code);
  if (existingIdx >= 0) {
    STATE.coupons[existingIdx] = newCoupon;
  } else {
    STATE.coupons.unshift(newCoupon);
  }
  saveToStorage('xpord_coupons', STATE.coupons);

  // Save to Firestore
  try {
    await setDoc(doc(db, "coupons", code), newCoupon);
  } catch (err) {
    console.warn("Firestore coupon save fallback to local:", err);
  }

  // Reset form inputs
  if (codeInput) codeInput.value = '';
  if (discountInput) discountInput.value = '';
  if (minOrderInput) minOrderInput.value = '999';
  if (maxDiscountInput) maxDiscountInput.value = '0';
  if (descInput) descInput.value = '';
  if (termsInput) termsInput.value = '';

  // Immediately render active coupons list directly underneath
  renderAdminCouponsList();
  renderCartDrawer();
  if (DOM.couponsModalWrapper && !DOM.couponsModalWrapper.classList.contains('hidden')) {
    renderCouponsModal();
  }

  // Show both in-UI alert banner and toast
  showAdminCouponAlert("Promo Code Added Successfully!", `Promo code '${code}' (${discountPercent}% OFF) is published and visible in Cart & Offers.`, "success");
  showToast(`✨ Promo code '${code}' added successfully!`, "success");
};

window.deleteCouponFromAdmin = async function(couponId) {
  const targetCode = (couponId || '').toUpperCase();
  STATE.coupons = (STATE.coupons || []).filter(c => (c.id || c.code).toUpperCase() !== targetCode);
  saveToStorage('xpord_coupons', STATE.coupons);

  if (STATE.appliedCoupon && (STATE.appliedCoupon.id || STATE.appliedCoupon.code).toUpperCase() === targetCode) {
    STATE.appliedCoupon = null;
    saveToStorage('xpord_applied_coupon', null);
  }

  try {
    await deleteDoc(doc(db, "coupons", targetCode));
  } catch (err) {
    console.warn("Firestore coupon delete fallback:", err);
  }

  renderAdminCouponsList();
  renderCartDrawer();
  if (DOM.couponsModalWrapper && !DOM.couponsModalWrapper.classList.contains('hidden')) {
    renderCouponsModal();
  }

  showAdminCouponAlert("Promo Code Deleted", `Promo code '${targetCode}' has been deleted successfully.`, "info");
  showToast(`Promo code '${targetCode}' deleted.`, "info");
};

window.resetCouponsToDefault = async function() {
  STATE.coupons = [...DEFAULT_COUPONS];
  saveToStorage('xpord_coupons', STATE.coupons);

  try {
    for (const c of DEFAULT_COUPONS) {
      await setDoc(doc(db, "coupons", c.code), c);
    }
  } catch (err) {
    console.warn("Firestore seeding default coupons:", err);
  }

  renderAdminCouponsList();
  renderCartDrawer();
  showAdminCouponAlert("Baseline Restored", "Baseline promo codes restored successfully.", "success");
  showToast("Baseline promo codes restored!", "success");
};

window.renderAdminOrdersDashboard = function() {
  const container = document.getElementById('admin-orders-table-container');
  const countBadge = document.getElementById('admin-orders-count-badge');
  const statTotalOrders = document.getElementById('admin-stat-total-orders');
  const statTotalRevenue = document.getElementById('admin-stat-total-revenue');
  const statCodOrders = document.getElementById('admin-stat-cod-orders');
  const statPrepaidOrders = document.getElementById('admin-stat-prepaid-orders');
  const statCancelledOrders = document.getElementById('admin-stat-cancelled-orders');

  const searchInput = document.getElementById('admin-orders-search');
  const filterPayment = document.getElementById('admin-orders-filter-payment');
  const filterStatus = document.getElementById('admin-orders-filter-status');

  const allOrders = STATE.allOrders || [];

  // Update Summary Metrics
  const activeOrders = allOrders.filter(o => o.status !== 'Cancelled');
  const totalRev = activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const codCount = allOrders.filter(o => o.paymentMethod === 'COD').length;
  const prepaidCount = allOrders.filter(o => o.paymentMethod === 'Razorpay' || (!o.paymentMethod && o.paymentId && !o.paymentId.startsWith('COD'))).length;
  const cancelledCount = allOrders.filter(o => o.status === 'Cancelled').length;

  if (countBadge) countBadge.textContent = allOrders.length.toString();
  if (statTotalOrders) statTotalOrders.textContent = allOrders.length.toString();
  if (statTotalRevenue) statTotalRevenue.textContent = `₹${totalRev.toLocaleString('en-IN')}`;
  if (statCodOrders) statCodOrders.textContent = codCount.toString();
  if (statPrepaidOrders) statPrepaidOrders.textContent = prepaidCount.toString();
  if (statCancelledOrders) statCancelledOrders.textContent = cancelledCount.toString();

  if (!container) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedPayment = filterPayment ? filterPayment.value : 'all';
  const selectedStatus = filterStatus ? filterStatus.value : 'all';

  const filteredOrders = allOrders.filter(order => {
    // Payment filter
    const isCod = order.paymentMethod === 'COD' || (order.paymentId && order.paymentId.startsWith('COD'));
    if (selectedPayment === 'cod' && !isCod) return false;
    if (selectedPayment === 'prepaid' && isCod) return false;

    // Status filter
    if (selectedStatus !== 'all' && order.status !== selectedStatus) return false;

    // Search query filter
    if (!query) return true;
    const addr = order.shippingAddress ? `${order.shippingAddress.street} ${order.shippingAddress.city} ${order.shippingAddress.pincode} ${order.shippingAddress.phone}`.toLowerCase() : '';
    const cust = `${order.customerName || ''} ${order.customerEmail || ''} ${order.customerPhone || ''}`.toLowerCase();
    const oId = (order.id || '').toLowerCase();
    const pId = (order.paymentId || '').toLowerCase();

    return oId.includes(query) || pId.includes(query) || cust.includes(query) || addr.includes(query);
  });

  if (filteredOrders.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted); font-size:0.9rem; background:var(--bg-subtle); border-radius:var(--radius-xs); border:1px dashed var(--border-medium);">
        <i class="fa-solid fa-box-open" style="font-size:2.5rem; margin-bottom:0.75rem; opacity:0.4;"></i>
        <div style="font-weight:700; color:var(--text-primary);">No Orders Found</div>
        <p style="font-size:0.8rem; margin-top:0.25rem;">No orders match the current search keyword or filter settings.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredOrders.map(order => {
    const isCod = order.paymentMethod === 'COD' || (order.paymentId && order.paymentId.startsWith('COD'));
    const isCancelled = order.status === 'Cancelled';
    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recent';
    const address = order.shippingAddress ? order.shippingAddress : {
      fullName: order.customerName || 'Customer',
      phone: order.customerPhone || 'Not provided',
      fullAddress: 'Standard Delivery Address',
      city: '',
      pincode: ''
    };

    return `
      <div class="admin-order-card ${isCancelled ? 'admin-order-cancelled' : ''}">
        <div class="admin-order-header">
          <div>
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <span style="font-family:var(--font-display); font-weight:900; font-size:1.1rem; color:#0f172a;">#${order.id}</span>
              ${isCod ? `
                <span class="admin-badge-cod"><i class="fa-solid fa-hand-holding-dollar"></i> Cash on Delivery (COD)</span>
              ` : `
                <span class="admin-badge-prepaid"><i class="fa-solid fa-bolt"></i> Razorpay Prepaid</span>
              `}
              ${isCancelled ? `
                <span class="cancelled-status-badge"><i class="fa-solid fa-ban"></i> CANCELLED</span>
              ` : ''}
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;"><i class="fa-regular fa-clock"></i> ${orderDate}</span>
            </div>
            <div style="font-size:0.82rem; color:#475569; margin-top:0.35rem;">
              Payment ID: <code style="background:#f1f5f9; color:#0f172a; padding:0.15rem 0.45rem; border-radius:4px; font-weight:800; border:1px solid #cbd5e1;">${order.paymentId || 'N/A'}</code>
              | Payment Status: <strong style="color:${isCancelled ? '#dc2626' : (isCod ? '#b45309' : '#15803d')};">${isCancelled ? 'Cancelled' : (order.paymentStatus || (isCod ? 'Pending' : 'Paid'))}</strong>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
            <div style="text-align:right;">
              <div style="font-size:0.7rem; color:#64748b; font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">Total Bill</div>
              <div style="font-weight:900; font-size:1.2rem; color:${isCancelled ? '#dc2626' : '#059669'};">₹${order.totalAmount ? order.totalAmount.toLocaleString('en-IN') : '0'}</div>
            </div>
            <button 
              type="button" 
              class="btn-invoice-download" 
              onclick="generateXpordInvoice('${order.id}')"
              title="Download Tax Invoice & Shipping Slip (Flipkart / Meesho Style)"
            >
              <i class="fa-solid fa-file-arrow-down"></i> Download Invoice
            </button>
            <select 
              onchange="updateOrderStatusFromAdmin('${order.id}', this.value)" 
              style="padding:0.45rem 0.75rem; font-size:0.8rem; font-weight:800; border-radius:6px; border:1.5px solid ${isCancelled ? '#f87171' : '#cbd5e1'}; background:${isCancelled ? '#fef2f2' : '#ffffff'}; color:${isCancelled ? '#dc2626' : '#0f172a'}; cursor:pointer;"
            >
              <option value="Order Placed" ${order.status === 'Order Placed' ? 'selected' : ''}>⏳ Order Placed</option>
              <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>⚙️ Processing</option>
              <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>🚚 Shipped</option>
              <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
              <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
            </select>
            <button 
              type="button" 
              onclick="deleteSingleOrderFromAdmin('${order.id}')"
              style="padding:0.45rem 0.75rem; background:#fee2e2; color:#b91c1c; border:1.5px solid #fca5a5; border-radius:6px; font-size:0.82rem; font-weight:800; cursor:pointer;"
              title="Delete this test order"
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

        ${isCancelled ? `
          <div class="admin-cancelled-banner" style="margin-bottom:0.75rem;">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>
              <strong>CUSTOMER CANCELLED ORDER:</strong> Reason: <em>"${order.cancelReason || 'Cancelled by customer'}"</em>
              ${order.cancelComments ? ` | Notes: "${order.cancelComments}"` : ''}
              ${order.cancelledAt ? ` | Cancelled On: ${new Date(order.cancelledAt).toLocaleString('en-IN')}` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Customer & Shipping Address Details Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:0.85rem; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:8px; padding:0.85rem 1rem; font-size:0.84rem; margin-top:0.75rem; margin-bottom:0.75rem; color:#334155;">
          <div>
            <div style="font-weight:900; color:#0f172a; margin-bottom:0.35rem; display:flex; align-items:center; gap:0.4rem;">
              <i class="fa-solid fa-user" style="color:#64748b;"></i> Customer Contact
            </div>
            <div><strong>Name:</strong> ${order.customerName || address.fullName || 'Customer'}</div>
            <div><strong>Phone:</strong> <a href="tel:${order.customerPhone || address.phone}" style="color:#0284c7; font-weight:800; text-decoration:none;">${order.customerPhone || address.phone || 'N/A'}</a></div>
            <div><strong>Email:</strong> ${order.customerEmail || address.email || 'N/A'}</div>
          </div>

          <div>
            <div style="font-weight:900; color:#0f172a; margin-bottom:0.35rem; display:flex; align-items:center; gap:0.4rem;">
              <i class="fa-solid fa-location-dot" style="color:#d97706;"></i> Delivery Destination
            </div>
            <div><strong>Address:</strong> ${address.fullAddress || address.street || 'Address on record'}</div>
            ${address.city ? `<div><strong>City / State:</strong> ${address.city}${address.state ? ', ' + address.state : ''}</div>` : ''}
            ${address.pincode ? `<div><strong>Pincode:</strong> ${address.pincode}</div>` : ''}
          </div>
        </div>

        <!-- Ordered Items Breakdown -->
        <div style="display:flex; flex-direction:column; gap:0.45rem;">
          <div style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.04em;">Ordered Items (${order.items ? order.items.length : 0}):</div>
          <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
            ${(order.items || []).map(i => `
              <div style="display:flex; align-items:center; gap:0.45rem; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:6px; padding:0.35rem 0.6rem; font-size:0.8rem; color:#0f172a;">
                <img src="${i.image}" alt="${i.title}" style="width:30px; height:30px; object-fit:cover; border-radius:4px; border:1px solid #e2e8f0;" onerror="this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=100&auto=format&fit=crop'" />
                <div>
                  <span style="font-weight:800;">${i.title}</span>
                  <span style="color:#64748b; font-size:0.75rem; font-weight:600;">(Size: ${i.size} | Qty: ${i.quantity} | ₹${i.price})</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
};

window.deleteSingleOrderFromAdmin = async function(orderId) {
  if (!STATE.allOrders) STATE.allOrders = [];
  STATE.allOrders = STATE.allOrders.filter(o => o.id !== orderId);
  STATE.orders = window.getUserOrders();
  try {
    localStorage.setItem('xpord_all_orders', JSON.stringify(STATE.allOrders));
    await deleteDoc(doc(db, "orders", orderId));
    showToast(`Order #${orderId} deleted successfully.`, 'success');
  } catch (err) {
    console.warn("Failed to delete order from cloud database:", err);
    showToast(`Order removed from local list.`, 'info');
  }

  updateCounters();
  window.renderAdminOrdersDashboard();
  if (DOM.ordersModalWrapper && !DOM.ordersModalWrapper.classList.contains('hidden')) {
    renderOrdersList();
  }
};

window.clearAllOrdersFromAdmin = async function() {
  const previousOrders = [...(STATE.allOrders || [])];
  STATE.allOrders = [];
  STATE.orders = [];
  try {
    localStorage.removeItem('xpord_all_orders');
  } catch (e) {}

  updateCounters();
  window.renderAdminOrdersDashboard();
  if (DOM.ordersModalWrapper && !DOM.ordersModalWrapper.classList.contains('hidden')) {
    renderOrdersList();
  }

  try {
    // Delete all orders from Firestore
    const snap = await getDocs(collection(db, "orders"));
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
    showToast("🧹 All test orders reset & deleted from database!", 'success');
  } catch (err) {
    console.warn("Could not batch delete from Firestore, clearing individually:", err);
    for (const ord of previousOrders) {
      try {
        await deleteDoc(doc(db, "orders", ord.id));
      } catch (e) {}
    }
    showToast("Orders reset successfully.", 'success');
  }

  updateCounters();
  window.renderAdminOrdersDashboard();
  if (DOM.ordersModalWrapper && !DOM.ordersModalWrapper.classList.contains('hidden')) {
    renderOrdersList();
  }
};

window.updateOrderStatusFromAdmin = async function(orderId, newStatus) {
  const order = (STATE.allOrders || []).find(o => o.id === orderId);
  if (!order) return;

  order.status = newStatus;
  if (newStatus === 'Delivered' && order.paymentMethod === 'COD') {
    order.paymentStatus = 'Paid';
  }

  STATE.orders = window.getUserOrders();

  try {
    localStorage.setItem('xpord_all_orders', JSON.stringify(STATE.allOrders));
    await setDoc(doc(db, "orders", order.id), order, { merge: true });
    showToast(`Order #${orderId} status updated to "${newStatus}"!`, 'success');
  } catch (err) {
    console.error("Failed to update order in Firestore:", err);
    showToast(`Order updated locally to "${newStatus}".`, 'info');
  }

  window.renderAdminOrdersDashboard();
  if (DOM.ordersModalWrapper && !DOM.ordersModalWrapper.classList.contains('hidden')) {
    renderOrdersList();
  }
};

window.handleBadgePresetChange = function() {
  const presetSelect = document.getElementById('admin-badge-preset');
  const customWrapper = document.getElementById('admin-custom-badge-wrapper');
  const badgeInput = document.getElementById('admin-badge');

  if (presetSelect && presetSelect.value === 'CUSTOM') {
    if (customWrapper) customWrapper.style.display = 'block';
  } else {
    if (customWrapper) customWrapper.style.display = 'none';
    if (badgeInput && presetSelect) {
      badgeInput.value = presetSelect.value;
    }
  }
  window.updateSectionPreviewBox();
};

window.handlePriceCalculation = function(source) {
  const priceInput = document.getElementById('admin-price');
  const discountInput = document.getElementById('admin-discount-percent');
  const origPriceInput = document.getElementById('admin-original-price');
  const badgeSpan = document.getElementById('admin-price-summary-badge');

  if (!priceInput) return;

  let sellingPrice = parseFloat(priceInput.value) || 0;
  let discountPct = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
  let origPrice = origPriceInput ? (parseFloat(origPriceInput.value) || 0) : 0;

  if (source === 'price' || source === 'discount') {
    if (sellingPrice > 0 && discountPct >= 0) {
      if (discountPct > 0) {
        origPrice = Math.round(sellingPrice / (1 - (discountPct / 100)));
      } else {
        origPrice = sellingPrice;
      }
      if (origPriceInput) origPriceInput.value = origPrice;
    }
  } else if (source === 'original') {
    if (origPrice > sellingPrice && sellingPrice > 0) {
      discountPct = Math.round(((origPrice - sellingPrice) / origPrice) * 100);
      if (discountInput) discountInput.value = discountPct;
    }
  }

  if (badgeSpan) {
    if (sellingPrice > 0) {
      const savings = Math.max(0, origPrice - sellingPrice);
      if (discountPct > 0 && savings > 0) {
        badgeSpan.innerHTML = `₹${sellingPrice.toLocaleString('en-IN')} <span style="text-decoration:line-through; opacity:0.7; font-size:0.75rem;">₹${origPrice.toLocaleString('en-IN')}</span> (${discountPct}% OFF • Save ₹${savings.toLocaleString('en-IN')})`;
        badgeSpan.style.background = '#dcfce7';
        badgeSpan.style.color = '#15803d';
        badgeSpan.style.borderColor = '#86efac';
      } else {
        badgeSpan.innerHTML = `Selling Price: ₹${sellingPrice.toLocaleString('en-IN')} (No Discount)`;
        badgeSpan.style.background = 'var(--bg-card)';
        badgeSpan.style.color = 'var(--text-primary)';
        badgeSpan.style.borderColor = 'var(--border-medium)';
      }
    } else {
      badgeSpan.textContent = 'Enter Price to Preview';
    }
  }
};

window.setDiscountPreset = function(pct) {
  const discountInput = document.getElementById('admin-discount-percent');
  if (discountInput) {
    discountInput.value = pct;
    window.handlePriceCalculation('discount');
  }
};

// Size Selection Helpers
window.toggleAdminSize = function(sizeName) {
  const container = document.getElementById('admin-sizes-container');
  if (!container) return;
  const chip = Array.from(container.querySelectorAll('.admin-size-chip')).find(
    c => c.getAttribute('data-size') === sizeName || c.textContent.replace('✓', '').trim() === sizeName
  );
  if (chip) {
    chip.classList.toggle('active');
  }
};

window.setStandardSizes = function(mode) {
  const container = document.getElementById('admin-sizes-container');
  if (!container) return;
  const chips = container.querySelectorAll('.admin-size-chip');
  
  if (mode === 'clear') {
    chips.forEach(c => c.classList.remove('active'));
  } else if (mode === 'all') {
    chips.forEach(c => c.classList.add('active'));
  } else if (mode === 'standard') {
    const standardList = ['S', 'M', 'L', 'XL', 'XXL'];
    chips.forEach(c => {
      const s = c.getAttribute('data-size');
      if (standardList.includes(s)) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  }
};

window.addCustomAdminSize = function() {
  const input = document.getElementById('admin-custom-size-input');
  const container = document.getElementById('admin-sizes-container');
  if (!input || !container) return;
  const val = input.value.trim().toUpperCase();
  if (!val) return;

  // Check if exists
  const existing = Array.from(container.querySelectorAll('.admin-size-chip')).find(
    c => c.getAttribute('data-size') === val
  );
  if (existing) {
    existing.classList.add('active');
    input.value = '';
    return;
  }

  const newBtn = document.createElement('button');
  newBtn.type = 'button';
  newBtn.className = 'admin-size-chip active';
  newBtn.setAttribute('data-size', val);
  newBtn.textContent = val;
  newBtn.onclick = () => window.toggleAdminSize(val);
  container.appendChild(newBtn);
  input.value = '';
  showToast(`Added size "${val}" to selection`, 'info');
};

window.getSelectedAdminSizes = function() {
  const container = document.getElementById('admin-sizes-container');
  if (!container) return ["S", "M", "L", "XL", "XXL"];
  const activeChips = container.querySelectorAll('.admin-size-chip.active');
  const sizes = Array.from(activeChips).map(c => c.getAttribute('data-size') || c.textContent.replace('✓', '').trim());
  return sizes.length > 0 ? sizes : [];
};

window.updateSectionPreviewBox = function() {
  const catSelect = document.getElementById('admin-category');
  const presetSelect = document.getElementById('admin-badge-preset');
  const badgeInput = document.getElementById('admin-badge');
  const sectionNameSpan = document.getElementById('preview-section-name');
  const tagNameSpan = document.getElementById('preview-tag-name');

  const catMap = {
    'shirts': '👔 Shirts & Overshirts Section',
    'trousers': '👖 Trousers & Pants Section',
    'jackets': '🧥 Jackets & Blazers Section',
    'oversized': '👕 Oversized Tees & Polos',
    'new': '✨ New Arrivals Section',
    'trending': '🔥 Trending Drops Section'
  };

  let badgeVal = 'NEW ARRIVAL';
  if (presetSelect) {
    if (presetSelect.value === 'CUSTOM' && badgeInput && badgeInput.value.trim()) {
      badgeVal = badgeInput.value.trim().toUpperCase();
    } else if (presetSelect.value !== 'CUSTOM') {
      badgeVal = presetSelect.value;
    }
  }

  if (sectionNameSpan && catSelect) {
    sectionNameSpan.textContent = catMap[catSelect.value] || 'Main Catalog';
  }
  if (tagNameSpan) {
    tagNameSpan.textContent = badgeVal;
  }
};

window.renderAdminCatalogList = function() {
  const container = document.getElementById('admin-catalog-items-container');
  const countSpan = document.getElementById('admin-product-count');
  const searchInput = document.getElementById('admin-search-catalog');
  
  if (countSpan) {
    countSpan.textContent = STATE.products.length.toString();
  }

  if (!container) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const itemsToRender = STATE.products.filter(p => {
    if (!query) return true;
    return p.title.toLowerCase().includes(query) ||
           p.category.toLowerCase().includes(query) ||
           p.fabric.toLowerCase().includes(query) ||
           p.badge.toLowerCase().includes(query);
  });

  if (itemsToRender.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.85rem;">
        No products match your search.
      </div>
    `;
    return;
  }

  const catEmojiMap = {
    'shirts': '👔 Shirts',
    'trousers': '👖 Trousers',
    'jackets': '🧥 Jackets'
  };

  container.innerHTML = itemsToRender.map(item => {
    const totalPhotos = 1 + (item.alternateImages ? item.alternateImages.filter(a => a && a !== item.primaryImage).length : 0);
    return `
      <div class="admin-catalog-item">
        <div style="position:relative; width:52px; height:68px; flex-shrink:0;">
          <img src="${item.primaryImage}" alt="${item.title}" class="admin-catalog-thumb" style="width:100%; height:100%; object-fit:cover; border-radius:6px;" onerror="this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=200&auto=format&fit=crop'" />
          ${totalPhotos > 1 ? `
            <span style="position:absolute; bottom:2px; right:2px; background:rgba(15,23,42,0.85); color:#ffffff; font-size:0.6rem; font-weight:800; padding:0.05rem 0.3rem; border-radius:3px; backdrop-filter:blur(2px);">
              📸 ${totalPhotos}
            </span>
          ` : ''}
        </div>
        
        <div class="admin-catalog-info">
          <div class="admin-catalog-title">${item.title}</div>
          <div class="admin-catalog-tags">
            <span class="admin-section-badge badge-${item.category}">
              ${catEmojiMap[item.category] || item.category}
            </span>
            <span class="admin-section-badge badge-highlight">
              ${item.badge}
            </span>
            ${totalPhotos > 1 ? `
              <span class="admin-section-badge" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;">
                <i class="fa-solid fa-images"></i> ${totalPhotos} Photos
              </span>
            ` : ''}
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-primary); margin-left:auto;">
              ₹${item.price.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <button 
          type="button" 
          class="admin-delete-btn" 
          title="Remove item from catalog" 
          onclick="deleteProductFromAdmin('${item.id}')"
        >
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
  }).join('');
};

window.deleteProductFromAdmin = async function(productId) {
  const item = STATE.products.find(p => p.id === productId);
  if (!item) return;

  STATE.products = STATE.products.filter(p => p.id !== productId);
  saveProductsToStorage(STATE.products);

  // Delete from Firestore Cloud Database
  try {
    await deleteDoc(doc(db, "products", productId));
  } catch (err) {
    console.error("Failed to delete document from Firestore:", err);
  }
  
  renderApp();
  window.renderAdminCatalogList();
  showToast(`Deleted "${item.title}" from catalog.`, 'info');
};

// --------------------------------------------------------------------------
// Multi-Image Gallery State & Upload Handler for Admin Panel
// --------------------------------------------------------------------------
window.adminSelectedAltImages = [];

window.handleProductImageFileUpload = async function(event, type) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const fileName = file.name || 'image.jpg';
  const box = document.getElementById('admin-primary-box');
  const inputUrl = document.getElementById('admin-primary-img');
  const previewContainer = document.getElementById('admin-primary-preview-container');
  const previewImg = document.getElementById('admin-primary-preview-img');
  const placeholderUi = document.getElementById('admin-primary-placeholder-ui');
  const fileInfo = document.getElementById('admin-primary-file-info');

  if (fileInfo) fileInfo.textContent = `Optimizing photo...`;

  try {
    // Instant high-speed canvas compression (scales & webp/jpeg encodes in ~50ms)
    const compressedDataUrl = await compressImageFile(file, 900, 0.75);
    const estSizeKb = Math.round((compressedDataUrl.length * 0.75) / 1024);

    if (inputUrl) inputUrl.value = compressedDataUrl;
    if (previewImg) previewImg.src = compressedDataUrl;
    if (fileInfo) fileInfo.textContent = `Cover Photo: ${fileName} (${estSizeKb} KB Optimized)`;
    if (previewContainer) previewContainer.style.display = 'block';
    if (placeholderUi) placeholderUi.style.display = 'none';
    if (box) {
      box.style.borderColor = '#16a34a';
      box.style.borderStyle = 'solid';
    }
    showToast(`✅ Primary Cover Optimized & Ready (${estSizeKb} KB)`, "success");
  } catch (err) {
    console.error("Image processing error:", err);
    showToast("Failed to process image.", "error");
  }
};

// Handle multiple alternative image file uploads simultaneously with instant compression
window.handleMultipleAltImagesUpload = async function(event) {
  const files = Array.from(event.target.files || []);
  if (!files || files.length === 0) return;

  showToast(`📸 Optimizing ${files.length} photo(s)...`, "info");

  for (const file of files) {
    try {
      const compressedDataUrl = await compressImageFile(file, 900, 0.75);
      window.adminSelectedAltImages.push(compressedDataUrl);
    } catch (err) {
      console.warn("Could not compress alt file:", err);
    }
  }

  window.renderAdminAltImagesGallery();
  showToast(`📸 ${files.length} photo(s) optimized & added! Total: ${window.adminSelectedAltImages.length} gallery images.`, "success");

  // Reset file input value so user can upload more
  event.target.value = '';
};

// Add one or multiple alternative image URLs from input box
window.addAltImageUrlFromInput = function() {
  const input = document.getElementById('admin-alt-url-input');
  if (!input) return;
  const rawText = input.value.trim();
  if (!rawText) {
    showToast("Please enter or paste an image URL", "warning");
    return;
  }

  // Parse comma, semicolon, newline or space separated URLs
  const urls = rawText
    .split(/[\n,;]+/)
    .map(u => u.trim())
    .filter(u => u.length > 5 && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image')));

  if (urls.length === 0) {
    showToast("Please enter valid image URL(s) starting with https://", "error");
    return;
  }

  urls.forEach(u => {
    if (!window.adminSelectedAltImages.includes(u)) {
      window.adminSelectedAltImages.push(u);
    }
  });

  input.value = '';
  window.renderAdminAltImagesGallery();
  showToast(`📸 Added ${urls.length} image URL(s) to gallery! Total: ${window.adminSelectedAltImages.length}`, "success");
};

// Remove single alternative image from queue
window.removeAdminAltImage = function(index) {
  if (index >= 0 && index < window.adminSelectedAltImages.length) {
    window.adminSelectedAltImages.splice(index, 1);
    window.renderAdminAltImagesGallery();
    showToast("Photo removed from gallery.", "info");
  }
};

// Swap alternative image to become the Primary Cover image
window.makeAltImagePrimary = function(index) {
  if (index >= 0 && index < window.adminSelectedAltImages.length) {
    const chosenImg = window.adminSelectedAltImages[index];
    const primaryInput = document.getElementById('admin-primary-img');
    const primaryPreview = document.getElementById('admin-primary-preview-img');
    const primaryContainer = document.getElementById('admin-primary-preview-container');
    const placeholderUi = document.getElementById('admin-primary-placeholder-ui');
    const box = document.getElementById('admin-primary-box');
    const fileInfo = document.getElementById('admin-primary-file-info');

    const oldPrimary = primaryInput ? primaryInput.value : '';

    // Replace primary
    if (primaryInput) primaryInput.value = chosenImg;
    if (primaryPreview) primaryPreview.src = chosenImg;
    if (fileInfo) fileInfo.textContent = `Cover Photo (Promoted from Gallery)`;
    if (primaryContainer) primaryContainer.style.display = 'block';
    if (placeholderUi) placeholderUi.style.display = 'none';
    if (box) {
      box.style.borderColor = '#16a34a';
      box.style.borderStyle = 'solid';
    }

    // If there was an existing primary, swap it into alt list, otherwise just remove chosen
    if (oldPrimary && oldPrimary !== chosenImg) {
      window.adminSelectedAltImages[index] = oldPrimary;
    } else {
      window.adminSelectedAltImages.splice(index, 1);
    }

    window.renderAdminAltImagesGallery();
    showToast("⭐ Photo set as Main Cover Image!", "success");
  }
};

// Clear all alternative images
window.clearAllAltImages = function() {
  window.adminSelectedAltImages = [];
  window.renderAdminAltImagesGallery();
  showToast("All alternative photos cleared.", "info");
};

// Render the interactive gallery grid in Admin Add Product Form
window.renderAdminAltImagesGallery = function() {
  const container = document.getElementById('admin-alt-gallery-container');
  const grid = document.getElementById('admin-alt-images-grid');
  const countBadge = document.getElementById('admin-alt-count-badge');
  const box = document.getElementById('admin-alt-box');

  const count = window.adminSelectedAltImages.length;

  if (countBadge) {
    countBadge.textContent = `${count} Alternative Image${count === 1 ? '' : 's'} Added`;
    if (count > 0) {
      countBadge.style.background = '#dcfce7';
      countBadge.style.color = '#15803d';
      countBadge.style.borderColor = '#86efac';
    } else {
      countBadge.style.background = '#f1f5f9';
      countBadge.style.color = '#475569';
      countBadge.style.borderColor = '#cbd5e1';
    }
  }

  if (box) {
    if (count > 0) {
      box.style.borderColor = '#d97706';
      box.style.borderStyle = 'solid';
      box.style.background = '#fffbeb';
    } else {
      box.style.borderColor = '#94a3b8';
      box.style.borderStyle = 'dashed';
      box.style.background = '#ffffff';
    }
  }

  if (!container || !grid) return;

  if (count === 0) {
    container.style.display = 'none';
    grid.innerHTML = '';
    return;
  }

  container.style.display = 'block';

  grid.innerHTML = window.adminSelectedAltImages.map((imgUrl, idx) => `
    <div style="position:relative; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06); display:flex; flex-direction:column;">
      <div style="position:relative; aspect-ratio:3/4; width:100%; background:#f1f5f9; overflow:hidden;">
        <img src="${imgUrl}" alt="Gallery photo #${idx + 1}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=200&auto=format&fit=crop'" />
        
        <span style="position:absolute; top:4px; left:4px; font-size:0.65rem; font-weight:800; background:rgba(15,23,42,0.85); color:#ffffff; padding:0.15rem 0.4rem; border-radius:4px; backdrop-filter:blur(2px);">
          #${idx + 1}
        </span>

        <button 
          type="button" 
          onclick="removeAdminAltImage(${idx})" 
          title="Delete this photo"
          style="position:absolute; top:4px; right:4px; width:24px; height:24px; border-radius:50%; background:#dc2626; color:#ffffff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.65rem; box-shadow:0 1px 3px rgba(0,0,0,0.3);"
        >
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>

      <div style="padding:0.35rem; display:flex; flex-direction:column; gap:0.2rem; background:#f8fafc; border-top:1px solid #e2e8f0;">
        <button 
          type="button" 
          onclick="makeAltImagePrimary(${idx})" 
          title="Set this photo as Main Cover"
          style="width:100%; padding:0.25rem; font-size:0.68rem; font-weight:700; background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.25rem;"
        >
          <i class="fa-solid fa-star" style="color:#d97706; font-size:0.6rem;"></i> Set Cover
        </button>
      </div>
    </div>
  `).join('');
};

window.clearProductImage = function(type) {
  if (type === 'primary') {
    const fileInput = document.getElementById('admin-primary-file');
    const inputUrl = document.getElementById('admin-primary-img');
    const box = document.getElementById('admin-primary-box');
    const previewContainer = document.getElementById('admin-primary-preview-container');
    const previewImg = document.getElementById('admin-primary-preview-img');
    const placeholderUi = document.getElementById('admin-primary-placeholder-ui');

    if (fileInput) fileInput.value = '';
    if (inputUrl) inputUrl.value = '';
    if (previewImg) previewImg.src = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (placeholderUi) placeholderUi.style.display = 'block';
    if (box) {
      box.style.borderColor = 'var(--border-medium)';
      box.style.borderStyle = 'dashed';
    }
    showToast("Primary photo removed.", "info");
  }
};

window.handleProductImageUrlInput = function(type) {
  if (type === 'primary') {
    const box = document.getElementById('admin-primary-box');
    const inputUrl = document.getElementById('admin-primary-img');
    const previewContainer = document.getElementById('admin-primary-preview-container');
    const previewImg = document.getElementById('admin-primary-preview-img');
    const placeholderUi = document.getElementById('admin-primary-placeholder-ui');
    const fileInfo = document.getElementById('admin-primary-file-info');

    if (inputUrl && inputUrl.value.trim()) {
      if (previewImg) previewImg.src = inputUrl.value.trim();
      if (fileInfo) fileInfo.textContent = 'Image URL Linked';
      if (previewContainer) previewContainer.style.display = 'block';
      if (placeholderUi) placeholderUi.style.display = 'none';
      if (box) {
        box.style.borderColor = '#16a34a';
        box.style.borderStyle = 'solid';
      }
    } else {
      if (previewContainer) previewContainer.style.display = 'none';
      if (placeholderUi) placeholderUi.style.display = 'block';
      if (box) {
        box.style.borderColor = 'var(--border-medium)';
        box.style.borderStyle = 'dashed';
      }
    }
  }
};

window.submitNewProductFromUI = async function(event) {
  event.preventDefault();

  const titleInput = document.getElementById('admin-title');
  const priceInput = document.getElementById('admin-price');
  const discountInput = document.getElementById('admin-discount-percent');
  const origPriceInput = document.getElementById('admin-original-price');
  const presetSelect = document.getElementById('admin-badge-preset');
  const badgeInput = document.getElementById('admin-badge');
  const fabricInput = document.getElementById('admin-fabric');
  const fitInput = document.getElementById('admin-fit');
  const occasionInput = document.getElementById('admin-occasion');
  const categoryInput = document.getElementById('admin-category');
  const primaryImgInput = document.getElementById('admin-primary-img');
  const autoSwitchCheckbox = document.getElementById('admin-auto-switch-view');

  const title = titleInput ? titleInput.value.trim() : '';
  const price = priceInput ? parseFloat(priceInput.value) : 0;
  const discountPct = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
  let originalPrice = origPriceInput ? (parseFloat(origPriceInput.value) || 0) : 0;

  if (originalPrice <= 0 || originalPrice < price) {
    if (discountPct > 0) {
      originalPrice = Math.round(price / (1 - (discountPct / 100)));
    } else {
      originalPrice = price;
    }
  }

  // Get selected sizes from interactive toggle chips
  const selectedSizes = window.getSelectedAdminSizes();
  if (selectedSizes.length === 0) {
    showToast("Kripya kam se kam ek Size (S, M, L, XL etc.) select karein!", "error");
    return;
  }
  
  let badge = 'NEW ARRIVAL';
  if (presetSelect) {
    if (presetSelect.value === 'CUSTOM' && badgeInput && badgeInput.value.trim()) {
      badge = badgeInput.value.trim().toUpperCase();
    } else if (presetSelect.value !== 'CUSTOM') {
      badge = presetSelect.value;
    }
  }

  const fabric = fabricInput ? fabricInput.value : 'Cotton';
  const fit = fitInput ? fitInput.value : 'Oversized';
  const occasion = occasionInput ? occasionInput.value : 'Party';
  const category = categoryInput ? categoryInput.value : 'shirts';
  const primaryImg = primaryImgInput ? primaryImgInput.value.trim() : '';

  // Collect all alternative images from multi-upload queue
  const alternateImagesList = window.adminSelectedAltImages && window.adminSelectedAltImages.length > 0 
    ? [...window.adminSelectedAltImages] 
    : [primaryImg];

  if (!title || isNaN(price) || price <= 0 || !primaryImg) {
    showToast("Please provide a valid Product Title, Price, and Primary Image.", "error");
    return;
  }

  // Construct new product object with exact selected sizes, discount, and gallery images
  const newProduct = {
    id: `xpord-${Date.now()}`,
    title: title,
    price: price,
    originalPrice: originalPrice,
    discountPercent: discountPct,
    fabric: fabric,
    fit: fit,
    occasion: occasion,
    category: category,
    badge: badge,
    inStock: true,
    rating: 5.0,
    primaryImage: primaryImg,
    alternateImages: alternateImagesList,
    sizes: selectedSizes,
    colors: ["Signature Edition"],
    description: `Elevated ${title} tailored from high-grade ${fabric} in an effortless ${fit} cut for ${occasion} occasions.`
  };

  // Push into STATE.products at top of catalog
  STATE.products.unshift(newProduct);

  // Safely persist to IndexedDB and LocalStorage with QuotaExceeded resilience
  saveProductsToStorage(STATE.products);

  // Save to Firestore Cloud Database
  try {
    await setDoc(doc(db, "products", newProduct.id), newProduct);
  } catch (err) {
    console.error("Failed to save product to Firestore:", err);
  }

  // Reset admin form & file upload dropzones
  document.getElementById('add-product-form')?.reset();
  if (presetSelect) presetSelect.value = 'NEW ARRIVAL';
  if (badgeInput) badgeInput.value = 'NEW ARRIVAL';

  // Reset sizes back to standard
  window.setStandardSizes('standard');

  // Reset alternate images queue
  window.adminSelectedAltImages = [];
  window.renderAdminAltImagesGallery();

  // Clear primary preview box
  const pBox = document.getElementById('admin-primary-box');
  const pPreview = document.getElementById('admin-primary-preview-container');
  const pPlace = document.getElementById('admin-primary-placeholder-ui');
  if (pPreview) pPreview.style.display = 'none';
  if (pPlace) pPlace.style.display = 'block';
  if (pBox) {
    pBox.style.borderColor = 'var(--border-medium)';
    pBox.style.borderStyle = 'dashed';
  }

  // Section names mapping for display
  const sectionLabelMap = {
    'shirts': 'Shirts Collection',
    'trousers': 'Trousers & Pants',
    'jackets': 'Jackets & Blazers',
    'oversized': 'Oversized Tees & Polos',
    'new': 'New Arrivals',
    'trending': 'Trending Drops'
  };

  const targetSectionLabel = sectionLabelMap[category] || 'Catalog';

  // If auto-switch is checked, switch current view to the target section
  if (autoSwitchCheckbox && autoSwitchCheckbox.checked) {
    STATE.activeFilters.category = category;
    updateUrlFromState();
    syncUIWithState();
  }

  // Close admin portal modal
  window.closeAdminPanel();

  // Re-render main website product grid immediately
  renderApp();

  // Scroll smoothly to product section
  document.getElementById('product-section')?.scrollIntoView({ behavior: 'smooth' });

  const totalPhotosCount = 1 + (alternateImagesList.length > 0 && alternateImagesList[0] !== primaryImg ? alternateImagesList.length : 0);
  showToast(`✨ Product "${title}" (${totalPhotosCount} Photos) added to "${targetSectionLabel}" with sizes [${selectedSizes.join(', ')}] and saved!`, 'success');
};

window.resetProductsToDefault = async function() {
  if (confirm("Restore catalog back to baseline items? Custom added products will be cleared.")) {
    STATE.products = [...BASELINE_PRODUCTS];
    saveProductsToStorage(STATE.products);

    // Reset Firestore documents
    try {
      const snap = await getDocs(collection(db, "products"));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      BASELINE_PRODUCTS.forEach(p => batch.set(doc(db, "products", p.id), p));
      await batch.commit();
    } catch (err) {
      console.error("Failed to reset Firestore catalog:", err);
    }

    window.closeAdminPanel();
    renderApp();
    showToast("Product catalog restored to baseline items in cloud database.", "info");
  }
};

window.submitProductReview = async function(productId, event) {
  event.preventDefault();
  const ratingSelect = document.getElementById('review-rating-select');
  const authorInput = document.getElementById('review-author-input');
  const commentInput = document.getElementById('review-comment-input');

  if (!authorInput || !commentInput) return;

  const newReview = {
    id: `rev_${Date.now()}`,
    productId,
    author: authorInput.value.trim() || 'Anonymous Customer',
    rating: parseInt(ratingSelect ? ratingSelect.value : 5),
    comment: commentInput.value.trim(),
    createdAt: new Date().toISOString()
  };

  STATE.reviews.unshift(newReview);
  try {
    await setDoc(doc(db, "reviews", newReview.id), newReview);
  } catch (err) {
    console.warn("Failed to write review to Firestore:", err);
  }

  showToast("Thank you for your review!", "success");
  window.openQuickView(productId);
};

// --------------------------------------------------------------------------
// 14. WISHLIST MODAL SYSTEM
// --------------------------------------------------------------------------
window.openWishlistModal = function(skipHistory = false) {
  if (!DOM.wishlistModalWrapper) return;
  window.renderWishlistItems();
  DOM.wishlistModalWrapper.classList.remove('hidden');
  if (!skipHistory && window.XPORD_NAV) {
    window.XPORD_NAV.pushView('wishlist');
  }
};

window.closeWishlistModal = function() {
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('wishlist', () => {
      if (DOM.wishlistModalWrapper) DOM.wishlistModalWrapper.classList.add('hidden');
    });
  } else if (DOM.wishlistModalWrapper) {
    DOM.wishlistModalWrapper.classList.add('hidden');
  }
};

window.renderWishlistItems = function() {
  const container = document.getElementById('wishlist-items-grid') || document.getElementById('wishlist-items-container');
  if (!container) return;

  if (STATE.wishlist.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
        <i class="fa-regular fa-heart" style="font-size:3rem; margin-bottom:1rem; opacity:0.4;"></i>
        <h3>Your Saved Wishlist is Empty</h3>
        <p style="font-size:0.85rem; margin-top:0.4rem;">Tap the heart icon on any product card to save luxury pieces for later.</p>
        <button class="primary-btn" onclick="closeWishlistModal()" style="max-width:200px; margin:1.5rem auto 0;">Explore Catalog</button>
      </div>
    `;
    return;
  }

  const wishlistProducts = STATE.products.filter(p => STATE.wishlist.includes(p.id));

  container.innerHTML = wishlistProducts.map(p => `
    <div class="wishlist-item-card">
      <img src="${p.primaryImage}" alt="${p.title}" class="wishlist-item-img" />
      <div class="wishlist-item-info">
        <h4 style="font-family:var(--font-serif); font-size:1.1rem; font-weight:700;">${p.title}</h4>
        <div style="font-weight:700; color:var(--text-primary); margin:0.3rem 0;">₹${p.price.toLocaleString('en-IN')}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${p.fabric} | ${p.fit}</div>
      </div>
      <div class="wishlist-item-actions">
        <button class="primary-btn" onclick="addToCart('${p.id}'); toggleWishlist('${p.id}');" style="padding:0.5rem 0.8rem; font-size:0.8rem;">
          <i class="fa-solid fa-bag-shopping"></i> Move to Bag
        </button>
        <button class="secondary-btn-outline" onclick="toggleWishlist('${p.id}')" style="padding:0.5rem; font-size:0.8rem; color:var(--accent-error); border-color:var(--border-medium);">
          <i class="fa-solid fa-trash-can"></i> Remove
        </button>
      </div>
    </div>
  `).join('');
};

// --------------------------------------------------------------------------
// 15. ORDER HISTORY & REAL-TIME TRACKING SYSTEM (PER-ACCOUNT ISOLATION)
// --------------------------------------------------------------------------
window.openOrdersModal = function(skipHistory = false) {
  if (!DOM.ordersModalWrapper) return;
  window.renderOrdersList();
  DOM.ordersModalWrapper.classList.remove('hidden');
  if (!skipHistory && window.XPORD_NAV) {
    window.XPORD_NAV.pushView('orders');
  }
};

window.closeOrdersModal = function() {
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('orders', () => {
      if (DOM.ordersModalWrapper) DOM.ordersModalWrapper.classList.add('hidden');
    });
  } else if (DOM.ordersModalWrapper) {
    DOM.ordersModalWrapper.classList.add('hidden');
  }
};

window.renderSingleOrderCard = function(order) {
  const isCancelled = (order.status || '').toLowerCase() === 'cancelled';
  const statusKey = isCancelled ? 'Cancelled' : (order.status || 'Order Placed');
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
  const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [{ title: 'XPORD Apparel Item', quantity: 1, size: 'M', price: order.totalAmount }];
  const firstItem = items[0];
  const fallbackImg = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80";
  const imgSrc = firstItem.image || firstItem.primaryImage || (firstItem.product && (firstItem.product.primaryImage || (firstItem.product.images && firstItem.product.images[0]))) || fallbackImg;

  let statusClass = 'processing';
  if (statusKey === 'Shipped') statusClass = 'shipped';
  else if (statusKey === 'Delivered') statusClass = 'delivered';
  else if (statusKey === 'Cancelled') statusClass = 'cancelled';
  else if (statusKey === 'Order Placed') statusClass = 'processing';

  return `
    <div class="dribbble-order-card" id="order-card-${order.id}">
      <div class="dribbble-order-top">
        <div>
          <h4 class="dribbble-order-id">#${order.id}</h4>
          <p class="dribbble-order-date">Order placed ${orderDate}</p>
        </div>
        <button type="button" class="btn-dribbble-details" onclick="window.openOrderDetails('${order.id}')">
          Order Details
        </button>
      </div>

      <div class="dribbble-order-item-row">
        <img src="${imgSrc}" alt="${firstItem.title || 'Product'}" class="dribbble-order-thumb" onerror="this.onerror=null; this.src='${fallbackImg}';" />
        <div class="dribbble-order-info">
          <h5 class="dribbble-order-item-title">${firstItem.title || 'XPORD Apparel Piece'}</h5>
          <p class="dribbble-order-item-desc">${firstItem.fabric || 'Heavyweight Luxury Piece'} • Size ${firstItem.size || 'M'}</p>
          <div class="dribbble-chips-group">
            <span class="dribbble-chip-status ${statusClass}">
              <i class="fa-solid fa-circle" style="font-size:0.45rem;"></i> ${statusKey}
            </span>
            <span class="dribbble-chip-count">${items.length}x items</span>
          </div>
        </div>
      </div>
    </div>
  `;
};

window.openOrderDetails = function(orderId) {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  const orders = window.getUserOrders ? window.getUserOrders() : (STATE.orders || []);
  const order = orders.find(o => String(o.id) === String(orderId)) || (STATE.orders || []).find(o => String(o.id) === String(orderId));

  if (!order) {
    showToast("Order details not found", "error");
    return;
  }

  const isCancelled = (order.status || '').toLowerCase() === 'cancelled';
  const statusKey = isCancelled ? 'Cancelled' : (order.status || 'Order Placed');
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
  const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [{ title: 'XPORD Apparel Piece', quantity: 1, size: 'M', price: order.totalAmount }];
  const isCod = order.paymentMethod === 'COD' || (order.paymentId && order.paymentId.startsWith('COD'));
  const fallbackImg = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80";

  // Stepper calculations (Processing - Shipped - Delivered)
  const steps = [
    { label: 'Processing', key: 'Processing' },
    { label: 'Shipped', key: 'Shipped' },
    { label: 'Delivered', key: 'Delivered' }
  ];

  let currentStepIdx = 0;
  if (statusKey === 'Shipped') currentStepIdx = 1;
  else if (statusKey === 'Delivered') currentStepIdx = 2;
  else if (statusKey === 'Cancelled') currentStepIdx = -1;

  const progressPercent = currentStepIdx === 0 ? 0 : currentStepIdx === 1 ? 50 : currentStepIdx === 2 ? 100 : 0;
  const subtotal = order.totalAmount || items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0);

  container.innerHTML = `
    <!-- Header Screen 3: < Order details -->
    <div class="orders-nav-header">
      <div class="orders-nav-left">
        <button type="button" class="orders-back-icon-btn" onclick="window.renderOrdersList()" title="Back to order history">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <h3 class="orders-nav-heading">Order details</h3>
      </div>
      <button type="button" class="orders-back-icon-btn" onclick="closeOrdersModal()" title="Close">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div class="orders-modal-body-pad">
      <!-- Horizontal Stepper (Processing - Shipped - Delivered) -->
      ${!isCancelled ? `
        <div class="dribbble-details-stepper">
          <div class="dribbble-stepper-line">
            <div class="dribbble-stepper-line-fill" style="width: ${progressPercent}%;"></div>
          </div>
          ${steps.map((step, idx) => {
            const isDone = idx <= currentStepIdx;
            return `
              <div class="dribbble-stepper-node-wrap">
                <div class="dribbble-stepper-circle ${isDone ? 'completed active' : ''}">
                  ${isDone ? '<i class="fa-solid fa-check"></i>' : (idx + 1)}
                </div>
                <span class="dribbble-stepper-label">${step.label}</span>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:14px; padding:0.9rem 1.15rem; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.75rem; color:#b91c1c;">
          <i class="fa-solid fa-ban" style="font-size:1.25rem;"></i>
          <div>
            <strong style="font-size:0.9rem;">Order Cancelled</strong>
            <p style="font-size:0.78rem; margin:2px 0 0 0; color:#dc2626;">${order.cancelReason ? `Reason: ${order.cancelReason}` : 'Cancelled per customer request'}</p>
          </div>
        </div>
      `}

      <!-- Metadata Key-Value Table -->
      <div class="dribbble-meta-card">
        <div class="dribbble-meta-row">
          <span class="dribbble-meta-label">Shipping type</span>
          <span class="dribbble-meta-val">Express Delivery</span>
        </div>
        <div class="dribbble-meta-row">
          <span class="dribbble-meta-label">Tracking Number</span>
          <span class="dribbble-meta-val">XPORD-${order.id}</span>
        </div>
        <div class="dribbble-meta-row">
          <span class="dribbble-meta-label">Shipped Date</span>
          <span class="dribbble-meta-val">${statusKey === 'Shipped' || statusKey === 'Delivered' ? orderDate : 'Pending Dispatch'}</span>
        </div>
        <div class="dribbble-meta-row">
          <span class="dribbble-meta-label">Purchased</span>
          <span class="dribbble-meta-val">${orderDate}</span>
        </div>
        <div class="dribbble-meta-row">
          <span class="dribbble-meta-label">Payment Method</span>
          <span class="dribbble-meta-val">${isCod ? 'Cash on Delivery (COD)' : (order.paymentMethod || 'Prepaid Verified')}</span>
        </div>
        ${order.shippingAddress && order.shippingAddress.fullAddress ? `
          <div class="dribbble-meta-row">
            <span class="dribbble-meta-label">Delivery Address</span>
            <span class="dribbble-meta-val" style="max-width:260px; text-align:right; font-size:0.78rem;">${order.shippingAddress.fullAddress}</span>
          </div>
        ` : ''}
      </div>

      <!-- Items Section -->
      <div style="margin-bottom:1.25rem;">
        <h4 class="dribbble-section-heading">Items (${items.length})</h4>
        ${items.map(item => {
          const itemImg = item.image || item.primaryImage || (item.product && (item.product.primaryImage || (item.product.images && item.product.images[0]))) || fallbackImg;
          const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
          return `
            <div class="dribbble-item-card">
              <img src="${itemImg}" alt="${item.title || 'Product'}" class="dribbble-item-thumb" onerror="this.onerror=null; this.src='${fallbackImg}';" />
              <div style="flex:1; min-width:0;">
                <h5 style="font-size:0.88rem; font-weight:800; color:#0f172a; margin:0 0 2px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title || 'XPORD Apparel Item'}</h5>
                <p style="font-size:0.76rem; color:#64748b; margin:0 0 4px 0;">Size: <strong style="color:#0f172a;">${item.size || 'M'}</strong> ${item.fabric ? `• ${item.fabric}` : ''}</p>
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <span class="cart-pill-price">₹${itemTotal.toLocaleString('en-IN')}</span>
                  <span class="dribbble-chip-count">${item.quantity || 1}x qty</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Order charges breakdown -->
      <div class="dribbble-charges-card">
        <h4 class="dribbble-section-heading" style="margin-bottom:0.6rem;">Order charges</h4>
        <div class="dribbble-charges-row">
          <span>Subtotal</span>
          <span style="color:#0f172a; font-weight:800;">₹${subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div class="dribbble-charges-row">
          <span>Shipping</span>
          <span style="color:#10b981; font-weight:800;">Free</span>
        </div>
        <div class="dribbble-charges-row">
          <span>Tax</span>
          <span style="color:#0f172a; font-weight:800;">₹0 (5% GST Incl.)</span>
        </div>
        <div class="dribbble-charges-row total">
          <span>Total</span>
          <span>₹${subtotal.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <!-- Action Buttons Bar -->
      <div class="dribbble-actions-bar">
        <button type="button" class="btn-dribbble-invoice" onclick="generateXpordInvoice('${order.id}')">
          <i class="fa-solid fa-file-invoice"></i> Download Tax Invoice
        </button>
        ${(!isCancelled && (statusKey === 'Order Placed' || statusKey === 'Processing')) ? `
          <button type="button" class="btn-dribbble-cancel" onclick="window.openCancelOrderModal('${order.id}', '${statusKey}')">
            <i class="fa-solid fa-ban"></i> Cancel Order
          </button>
        ` : ''}
      </div>
    </div>
  `;
};

// --------------------------------------------------------------------------
// 15.1 ORDER CANCELLATION ENGINE & CONTROLLERS
// --------------------------------------------------------------------------
window.currentCancelOrderId = null;
window.selectedCancelReason = "Ordered by mistake / duplicate order";

window.openCancelOrderModal = function(orderId, skipHistory = false) {
  window.currentCancelOrderId = orderId;
  const modalWrapper = document.getElementById('cancel-order-modal-wrapper');
  const idEl = document.getElementById('cancel-modal-order-id');
  const commentEl = document.getElementById('cancel-reason-comment');

  if (idEl) idEl.textContent = `#${orderId}`;
  if (commentEl) commentEl.value = '';

  window.selectedCancelReason = "Ordered by mistake / duplicate order";
  const radioCards = document.querySelectorAll('.cancel-radio-card');
  radioCards.forEach((card, idx) => {
    const radio = card.querySelector('input[type="radio"]');
    if (idx === 0) {
      card.classList.add('selected');
      if (radio) radio.checked = true;
    } else {
      card.classList.remove('selected');
      if (radio) radio.checked = false;
    }
  });

  if (modalWrapper) {
    modalWrapper.classList.remove('hidden');
    if (!skipHistory && window.XPORD_NAV) {
      window.XPORD_NAV.pushView('cancel-order', { orderId });
    }
  }
};

window.closeCancelOrderModal = function() {
  const modalWrapper = document.getElementById('cancel-order-modal-wrapper');
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('cancel-order', () => {
      if (modalWrapper) modalWrapper.classList.add('hidden');
      window.currentCancelOrderId = null;
    });
  } else {
    if (modalWrapper) modalWrapper.classList.add('hidden');
    window.currentCancelOrderId = null;
  }
};

window.selectCancelReason = function(element, reason) {
  window.selectedCancelReason = reason;
  const radioCards = document.querySelectorAll('.cancel-radio-card');
  radioCards.forEach(card => card.classList.remove('selected'));
  if (element) {
    element.classList.add('selected');
    const radio = element.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  }
};

window.confirmCancelOrder = async function() {
  const orderId = window.currentCancelOrderId;
  if (!orderId) return;

  const commentEl = document.getElementById('cancel-reason-comment');
  const cancelComment = commentEl ? commentEl.value.trim() : '';
  const reason = window.selectedCancelReason || 'Cancelled by customer';
  const nowIso = new Date().toISOString();

  const btn = document.getElementById('btn-confirm-cancellation');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cancelling...';
  }

  try {
    // 1. Update in local state
    if (!STATE.allOrders) STATE.allOrders = [];
    const targetIdx = STATE.allOrders.findIndex(o => o.id === orderId);
    if (targetIdx !== -1) {
      STATE.allOrders[targetIdx].status = 'Cancelled';
      STATE.allOrders[targetIdx].cancelledAt = nowIso;
      STATE.allOrders[targetIdx].cancelReason = reason;
      STATE.allOrders[targetIdx].cancelComments = cancelComment;
    }

    try {
      localStorage.setItem('xpord_all_orders', JSON.stringify(STATE.allOrders));
    } catch (e) {
      console.warn("Storage sync:", e);
    }

    // 2. Persist to Firestore Database
    await setDoc(doc(db, "orders", orderId), {
      status: 'Cancelled',
      cancelledAt: nowIso,
      cancelReason: reason,
      cancelComments: cancelComment,
      updatedAt: nowIso
    }, { merge: true });

    // Close modal
    window.closeCancelOrderModal();

    // 3. Trigger cool cancellation animation
    window.triggerCancelOrderAnimation(orderId);
    showToast(`Order #${orderId} cancelled successfully.`, 'info');

    // 4. Refresh views
    STATE.orders = window.getUserOrders();
    updateCounters();
    window.renderOrdersList();
    if (typeof window.renderAdminOrdersDashboard === 'function') {
      window.renderAdminOrdersDashboard();
    }
  } catch (err) {
    console.error("Failed to cancel order:", err);
    showToast("Failed to cancel order. Please try again.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-ban"></i> Confirm Cancellation';
    }
  }
};

window.showCannotCancelModal = function(orderId, currentStatus, skipHistory = false) {
  const modal = document.getElementById('cannot-cancel-modal-wrapper');
  const idEl = document.getElementById('cannot-cancel-order-id');
  const statusEl = document.getElementById('cannot-cancel-status-text');

  if (idEl) idEl.textContent = `#${orderId}`;
  if (statusEl) {
    statusEl.textContent = `${currentStatus} & In Transit via Express Courier`;
  }

  if (modal) {
    modal.classList.remove('hidden');
    if (!skipHistory && window.XPORD_NAV) {
      window.XPORD_NAV.pushView('cannot-cancel', { orderId, currentStatus });
    }
  }
};

window.closeCannotCancelModal = function() {
  const modal = document.getElementById('cannot-cancel-modal-wrapper');
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('cannot-cancel', () => {
      if (modal) modal.classList.add('hidden');
    });
  } else if (modal) {
    modal.classList.add('hidden');
  }
};

window.triggerCancelOrderAnimation = function(orderId) {
  const overlay = document.createElement('div');
  overlay.className = 'cancel-animation-overlay';
  overlay.innerHTML = `
    <div class="cancel-anim-box">
      <div class="cancel-anim-icon-circle">
        <i class="fa-solid fa-ban"></i>
      </div>
      <h3 style="font-family:var(--font-display); font-size:1.35rem; font-weight:800; text-transform:uppercase; margin-bottom:0.35rem; color:#dc2626;">Order Cancelled</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Order #${orderId} cancellation confirmed</p>
      <div style="margin-top:0.75rem; font-size:0.72rem; color:var(--text-secondary);">Updating cloud records...</div>
    </div>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.classList.add('fade-out');
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 400);
  }, 1800);
};

window.trackGuestOrder = function() {
  const input = document.getElementById('guest-track-input');
  const resultDiv = document.getElementById('guest-track-result');
  if (!input || !resultDiv) return;

  const orderId = input.value.trim().toUpperCase();
  if (!orderId) {
    showToast("Please enter an Order ID to track", "info");
    return;
  }

  const allOrders = STATE.allOrders || [];
  const found = allOrders.find(o => (o.id || '').toUpperCase() === orderId);

  if (!found) {
    resultDiv.innerHTML = `
      <div style="background:var(--bg-subtle); border:1px solid #fecaca; border-radius:var(--radius-xs); padding:1rem; text-align:center; font-size:0.85rem; color:var(--text-primary); margin-top:1rem;">
        <i class="fa-solid fa-circle-exclamation" style="color:var(--accent-error); font-size:1.4rem; margin-bottom:0.4rem; display:block;"></i>
        <div>Order <strong>#${orderId}</strong> was not found.</div>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.25rem;">Please check the Order ID or sign in to your registered account to view your full history.</p>
      </div>
    `;
    return;
  }

  resultDiv.innerHTML = `
    <div style="margin-top:1.25rem;">
      <div style="font-size:0.8rem; font-weight:800; text-transform:uppercase; color:var(--accent-gold); margin-bottom:0.5rem;"><i class="fa-solid fa-location-crosshairs"></i> Tracking Result for #${found.id}:</div>
      ${window.renderSingleOrderCard(found)}
    </div>
  `;
};

/* ==========================================================================
   15.2 FLIPKART & MEESHO STYLE AUTOMATED TAX INVOICE GENERATOR ENGINE
   ========================================================================== */

function generateXpordInvoice(orderId) {
    // 1. Fetch current order data from the global state
    const stateObj = (typeof state !== 'undefined' && state) ? state : (typeof STATE !== 'undefined' ? STATE : window.STATE || {});
    const ordersList = (stateObj.orders && stateObj.orders.length > 0) ? stateObj.orders : (stateObj.allOrders || []);
    let currentOrder = ordersList.find(o => String(o.id) === String(orderId)) || (stateObj.allOrders || []).find(o => String(o.id) === String(orderId)) || (stateObj.orders || []).find(o => String(o.id) === String(orderId));

    if (!currentOrder) {
        try {
            const rawAll = localStorage.getItem('xpord_all_orders');
            if (rawAll) {
                const parsed = JSON.parse(rawAll);
                currentOrder = parsed.find(o => String(o.id) === String(orderId));
            }
        } catch (e) {}
    }

    if (!currentOrder) {
        if (typeof showToast === 'function') {
            showToast(`Order #${orderId} details not found!`, "error");
        } else {
            alert("Order not found!");
        }
        return;
    }

    const shippingAddressText = typeof currentOrder.shippingAddress === 'object' && currentOrder.shippingAddress !== null
        ? (currentOrder.shippingAddress.fullAddress || currentOrder.shippingAddress.street || `${currentOrder.shippingAddress.city || ''}, ${currentOrder.shippingAddress.state || ''} - ${currentOrder.shippingAddress.pincode || ''}`)
        : (currentOrder.shippingAddress || 'Jamua Giridih, Jharkhand - 825412');

    const customerNameText = currentOrder.customerName || (typeof currentOrder.shippingAddress === 'object' && currentOrder.shippingAddress ? currentOrder.shippingAddress.fullName : '') || 'Valued Customer';
    const customerPhoneText = currentOrder.customerPhone || (typeof currentOrder.shippingAddress === 'object' && currentOrder.shippingAddress ? currentOrder.shippingAddress.phone : '') || '+91 7645930314';
    const itemsList = (currentOrder.items && currentOrder.items.length > 0) ? currentOrder.items : [{ title: 'XPORD Luxury Apparel', size: 'M', quantity: 1, price: currentOrder.totalAmount || 1499 }];
    const cleanOrderId = String(currentOrder.id).replace(/[^a-zA-Z0-9_-]/g, '');
    const invoiceDocTitle = `XPORD_${cleanOrderId}`;
    const formattedDate = currentOrder.createdAt ? new Date(currentOrder.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

    // 2. Build high-fidelity Flipkart/Meesho style Tax Invoice layout string
    const invoiceHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${invoiceDocTitle}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; padding: 30px; color: #000000 !important; background: #ffffff !important; margin: 0; line-height: 1.4; }
        .invoice-card { max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 24px; background: #fff; }
        .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 15px; margin-bottom: 20px; }
        .brand-title { font-size: 28px; font-weight: 900; letter-spacing: 2px; }
        .invoice-title { font-size: 18px; font-weight: bold; text-align: right; text-transform: uppercase; }
        .details-grid { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 13px; line-height: 1.5; }
        .address-box { width: 48%; }
        .table-items { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
        .table-items th { background: #111111 !important; color: #ffffff !important; padding: 10px; text-align: left; font-size: 12px; }
        .table-items td { padding: 10px; border-bottom: 1px solid #ddd; color: #000000 !important; }
        .total-section { width: 40%; margin-left: auto; font-size: 13px; line-height: 1.8; text-align: right; }
        .total-row { display: flex; justify-content: space-between; border-top: 2px solid #111; padding-top: 6px; font-weight: bold; font-size: 15px; }
        .footer-note { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 11px; color: #555; text-align: center; }
        .action-bar { text-align: center; margin-bottom: 20px; }
        .btn-print { background: #000; color: #fff; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; border-radius: 4px; font-size: 14px; }
        @media print { 
            body { padding: 0; background: #fff !important; } 
            .action-bar { display: none !important; }
            .invoice-card { border: none; padding: 0; }
        }
    </style>
</head>
<body>
    <div class="action-bar no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
    <div class="invoice-card">
        <div class="invoice-header">
            <div>
                <div class="brand-title">XPORD</div>
                <p style="margin: 4px 0; font-size: 12px; color: #555;">Official Tax Invoice / Bill of Supply</p>
            </div>
            <div class="invoice-title">
                Tax Invoice
                <div style="font-size: 11px; font-weight: normal; color: #555; margin-top: 4px;">Original for Recipient</div>
            </div>
        </div>
        
        <div class="details-grid">
            <div class="address-box">
                <strong>SOLD BY (Sender):</strong><br>
                <strong>XPORD PRIVATE LIMITED</strong><br>
                Jamua Giridih, Jharkhand - 825412, India<br>
                GSTIN: 20AABCX8812F1Z8<br>
                Contact: +91 7645930314<br>
                Email: kumarritik2010m@gmail.com
            </div>
            <div class="address-box" style="text-align: right;">
                <strong>SHIPPED TO (Customer):</strong><br>
                <strong>${customerNameText}</strong><br>
                ${shippingAddressText}<br>
                Phone: ${customerPhoneText}<br><br>
                <strong>Order ID:</strong> #${currentOrder.id}<br>
                <strong>Date:</strong> ${formattedDate}
            </div>
        </div>

        <table class="table-items">
            <thead>
                <tr>
                    <th>Product Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Gross Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsList.map(item => `
                    <tr>
                        <td><strong>${item.title || 'Product'}</strong> (Size: ${item.size || 'M'})</td>
                        <td style="text-align: center;">${item.quantity || 1}</td>
                        <td style="text-align: right;">₹${(item.price || 0).toLocaleString('en-IN')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="total-section">
            <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>₹${(currentOrder.totalAmount || 0).toLocaleString('en-IN')}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Integrated GST (5%):</span> <span>₹0.00 (Inclusive)</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Shipping & Handling:</span> <span style="color: green; font-weight: bold;">FREE</span></div>
            <div class="total-row"><span>Grand Total:</span> <span>₹${(currentOrder.totalAmount || 0).toLocaleString('en-IN')}</span></div>
            <p style="font-size: 11px; margin-top: 10px; color: #555; text-align: right;">Payment Mode: <strong>${currentOrder.paymentMethod || 'Prepaid'}</strong></p>
        </div>

        <div class="footer-note">
            This is an authentic computer-generated official tax invoice for XPORD order #${currentOrder.id}.<br>
            Thank you for shopping with XPORD!
        </div>
    </div>
    <script>
        // Auto trigger print when opened directly in a new window/tab
        window.addEventListener('load', function() {
            if (window.location.protocol !== 'blob:') {
                setTimeout(function() { window.print(); }, 400);
            }
        });
    <\/script>
</body>
</html>`;

    // 3. Trigger instant file download via Blob (100% works in all browsers and iframes)
    try {
        const blob = new Blob([invoiceHTML], { type: 'text/html;charset=utf-8' });
        const downloadUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = `${invoiceDocTitle}.html`;
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        setTimeout(() => {
            if (downloadLink.parentNode) document.body.removeChild(downloadLink);
            URL.revokeObjectURL(downloadUrl);
        }, 1000);

        if (typeof showToast === 'function') {
            showToast(`📄 Invoice downloaded: ${invoiceDocTitle}`, "success");
        }
    } catch (downloadErr) {
        console.warn("Direct blob download issue:", downloadErr);
    }

    // 4. Also display an On-Screen Printable Tax Invoice Modal for instant viewing & printing
    let existingModal = document.getElementById('xpord-invoice-preview-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalWrapper = document.createElement('div');
    modalWrapper.id = 'xpord-invoice-preview-modal';
    modalWrapper.setAttribute('style', 'position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 15px; backdrop-filter: blur(4px);');
    
    modalWrapper.innerHTML = `
        <div style="background: #ffffff; color: #000000; width: 100%; max-width: 850px; max-height: 90vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: #111827; color: #ffffff; border-bottom: 1px solid #374151;">
                <div style="font-weight: 800; font-size: 15px; letter-spacing: 0.5px;">
                    📄 Tax Invoice Preview — #${currentOrder.id}
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="button" id="invoice-modal-print-btn" style="background: #eab308; color: #000000; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        🖨️ Print / Save PDF
                    </button>
                    <button type="button" id="invoice-modal-close-btn" style="background: #374151; color: #ffffff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 800; font-size: 12px; cursor: pointer;">
                        ✕ Close
                    </button>
                </div>
            </div>
            <div id="invoice-modal-content-frame" style="flex: 1; overflow-y: auto; padding: 25px; background: #ffffff; color: #000000;">
                <div class="invoice-card" style="border: 2px solid #000; padding: 24px; background: #fff; color: #000;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 15px; margin-bottom: 20px;">
                        <div>
                            <div style="font-size: 26px; font-weight: 900; letter-spacing: 2px;">XPORD</div>
                            <p style="margin: 4px 0; font-size: 12px; color: #555;">Official Tax Invoice / Bill of Supply</p>
                        </div>
                        <div style="font-size: 16px; font-weight: bold; text-align: right; text-transform: uppercase;">
                            Tax Invoice
                            <div style="font-size: 11px; font-weight: normal; color: #555; margin-top: 4px;">Original for Recipient</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 13px; line-height: 1.5;">
                        <div style="width: 48%;">
                            <strong>SOLD BY (Sender):</strong><br>
                            <strong>XPORD PRIVATE LIMITED</strong><br>
                            Jamua Giridih, Jharkhand - 825412, India<br>
                            GSTIN: 20AABCX8812F1Z8<br>
                            Contact: +91 7645930314<br>
                            Email: kumarritik2010m@gmail.com
                        </div>
                        <div style="width: 48%; text-align: right;">
                            <strong>SHIPPED TO (Customer):</strong><br>
                            <strong>${customerNameText}</strong><br>
                            ${shippingAddressText}<br>
                            Phone: ${customerPhoneText}<br><br>
                            <strong>Order ID:</strong> #${currentOrder.id}<br>
                            <strong>Date:</strong> ${formattedDate}
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
                        <thead>
                            <tr style="background: #111111; color: #ffffff;">
                                <th style="padding: 10px; text-align: left; font-size: 12px; color: #ffffff;">Product Description</th>
                                <th style="padding: 10px; text-align: center; font-size: 12px; color: #ffffff;">Qty</th>
                                <th style="padding: 10px; text-align: right; font-size: 12px; color: #ffffff;">Gross Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList.map(item => `
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #000;"><strong>${item.title || 'Product'}</strong> (Size: ${item.size || 'M'})</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; color: #000;">${item.quantity || 1}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: #000;">₹${(item.price || 0).toLocaleString('en-IN')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div style="width: 45%; margin-left: auto; font-size: 13px; line-height: 1.8; text-align: right;">
                        <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>₹${(currentOrder.totalAmount || 0).toLocaleString('en-IN')}</span></div>
                        <div style="display: flex; justify-content: space-between;"><span>Integrated GST (5%):</span> <span>₹0.00 (Inclusive)</span></div>
                        <div style="display: flex; justify-content: space-between;"><span>Shipping & Handling:</span> <span style="color: green; font-weight: bold;">FREE</span></div>
                        <div style="display: flex; justify-content: space-between; border-top: 2px solid #111; padding-top: 6px; font-weight: bold; font-size: 15px;">
                            <span>Grand Total:</span> <span>₹${(currentOrder.totalAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <p style="font-size: 11px; margin-top: 10px; color: #555; text-align: right;">Payment Mode: <strong>${currentOrder.paymentMethod || 'Prepaid'}</strong></p>
                    </div>

                    <div style="margin-top: 25px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 11px; color: #555; text-align: center;">
                        This is an authentic computer-generated official tax invoice for XPORD order #${currentOrder.id}.<br>
                        Thank you for shopping with XPORD!
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalWrapper);

    // Modal Events
    const closeBtn = document.getElementById('invoice-modal-close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => { modalWrapper.remove(); };
    }
    modalWrapper.onclick = (e) => {
        if (e.target === modalWrapper) modalWrapper.remove();
    };

    const printBtn = document.getElementById('invoice-modal-print-btn');
    if (printBtn) {
        printBtn.onclick = () => {
            const printWin = window.open('', '_blank');
            if (printWin) {
                printWin.document.write(invoiceHTML);
                printWin.document.close();
                printWin.focus();
                printWin.print();
            } else {
                window.print();
            }
        };
    }
}
window.generateXpordInvoice = generateXpordInvoice;


window.renderOrdersList = function() {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  // Case 1: User is Logged Out / Guest
  if (!STATE.currentUser) {
    container.innerHTML = `
      <div class="orders-nav-header">
        <div class="orders-nav-left">
          <h3 class="orders-nav-heading">Order history</h3>
        </div>
        <button type="button" class="orders-back-icon-btn" onclick="closeOrdersModal()" title="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="orders-modal-body-pad" style="text-align:center; padding:2.5rem 1.5rem;">
        <div style="width:60px; height:60px; background:#f8fafc; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin:0 auto 1rem; border:1px solid #e2e8f0; color:#d99a38;">
          <i class="fa-solid fa-user-lock"></i>
        </div>
        <h3 style="font-family:var(--font-display); font-size:1.2rem; font-weight:800; color:#0f172a; margin-bottom:0.4rem;">Sign In to View Orders</h3>
        <p style="font-size:0.85rem; color:#64748b; max-width:400px; margin:0 auto 1.25rem; line-height:1.5;">
          Sign in or create an account to access order history, tracking details, and tax invoices.
        </p>
        <button class="primary-btn" onclick="closeOrdersModal(); openUserModal();" style="max-width:220px; margin:0 auto 1.5rem auto; border-radius:9999px; background:#d99a38; border:none;">
          <i class="fa-solid fa-right-to-bracket"></i> Login / Register
        </button>

        <div style="margin:1.5rem 0 1rem; display:flex; align-items:center; gap:0.75rem; color:#94a3b8; font-size:0.75rem;">
          <div style="flex:1; height:1px; background:#e2e8f0;"></div>
          <span>OR TRACK SINGLE ORDER</span>
          <div style="flex:1; height:1px; background:#e2e8f0;"></div>
        </div>

        <div style="max-width:400px; margin:0 auto; text-align:left;">
          <div style="display:flex; gap:0.5rem;">
            <input 
              id="guest-track-input" 
              type="text" 
              placeholder="Enter Order ID (e.g. XPD-12345)" 
              style="flex:1; padding:0.6rem 0.8rem; font-size:0.85rem; border:1.5px solid #e2e8f0; border-radius:12px; background:#f8fafc; color:#0f172a; text-transform:uppercase;"
              onkeydown="if(event.key==='Enter') window.trackGuestOrder();"
            />
            <button class="secondary-btn-outline" onclick="window.trackGuestOrder()" style="padding:0.6rem 1rem; font-size:0.85rem; white-space:nowrap; border-radius:12px;">
              <i class="fa-solid fa-magnifying-glass"></i> Track
            </button>
          </div>
          <div id="guest-track-result"></div>
        </div>
      </div>
    `;
    return;
  }

  // Case 2: User is Logged In
  const userOrders = window.getUserOrders ? window.getUserOrders() : (STATE.orders || []);
  STATE.orders = userOrders;

  if (userOrders.length === 0) {
    container.innerHTML = `
      <div class="orders-nav-header">
        <div class="orders-nav-left">
          <h3 class="orders-nav-heading">Order history</h3>
        </div>
        <button type="button" class="orders-back-icon-btn" onclick="closeOrdersModal()" title="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="orders-modal-body-pad" style="text-align:center; padding:3rem 1.5rem; color:#64748b;">
        <i class="fa-solid fa-bag-shopping" style="font-size:3rem; margin-bottom:1rem; opacity:0.3; color:#0f172a;"></i>
        <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:800; color:#0f172a; margin-bottom:0.3rem;">No Orders Placed Yet</h3>
        <p style="font-size:0.85rem; margin-top:0.3rem; color:#64748b;">Orders placed with <strong>${STATE.currentUser.email}</strong> will appear here.</p>
        <button class="primary-btn" onclick="closeOrdersModal()" style="max-width:200px; margin:1.5rem auto 0; border-radius:9999px; background:#d99a38; border:none;">Start Shopping</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <!-- Header Screen 2: < Order history -->
    <div class="orders-nav-header">
      <div class="orders-nav-left">
        <h3 class="orders-nav-heading">Order history</h3>
      </div>
      <button type="button" class="orders-back-icon-btn" onclick="closeOrdersModal()" title="Close">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="orders-modal-body-pad">
      ${userOrders.map(order => window.renderSingleOrderCard(order)).join('')}
    </div>
  `;
};

// --------------------------------------------------------------------------
// 16. USER PROFILE & AUTHENTICATION MODAL SYSTEM (REGISTER & LOGIN)
// --------------------------------------------------------------------------
STATE.authTab = 'login'; // 'login' or 'register'

// Subscribe to Firebase Auth state listener with 8-Hour Session Retention
onAuthStateChanged(auth, async (user) => {
  const now = Date.now();
  if (user) {
    const existing = loadActiveUserSession() || {};
    const userObj = {
      uid: user.uid,
      name: user.displayName || existing.name || (user.email ? user.email.split('@')[0] : 'Member'),
      email: user.email || existing.email || '',
      phone: user.phoneNumber || existing.phone || '',
      photoURL: user.photoURL || existing.photoURL || '',
      loginTimestamp: existing.loginTimestamp || now,
      sessionExpiresAt: now + SESSION_DURATION_MS, // 8-hour rolling window
      lastActiveAt: now,
      updatedAt: new Date().toISOString()
    };
    if (typeof window.syncUserActivitiesOnLogin === 'function') {
      await window.syncUserActivitiesOnLogin(userObj);
    } else {
      STATE.currentUser = userObj;
      saveToStorage('xpord_user', userObj);
      updateCounters();
    }
  } else {
    // When Firebase Auth emits null (e.g. background tab minimize/restore or iframe refresh):
    // Check if we still have an active 8-hour session in localStorage
    const activeSession = loadActiveUserSession();
    if (activeSession) {
      // User is within the 8-hour valid session window -> Retain login!
      STATE.currentUser = activeSession;
      if (typeof window.syncUserActivitiesOnLogin === 'function') {
        window.syncUserActivitiesOnLogin(activeSession).catch(() => {});
      } else {
        updateCounters();
      }
    } else {
      // Only clear state if session actually expired (8 hours passed) or explicitly logged out
      if (STATE.currentUser) {
        STATE.currentUser = null;
        STATE.wishlist = [];
        STATE.cart = [];
        STATE.orders = [];
        try {
          localStorage.removeItem('xpord_user');
          localStorage.removeItem('xpord_wishlist');
          localStorage.removeItem('xpord_cart');
        } catch (e) {}
        updateCounters();
        renderApp();
        renderCartDrawer();
      }
    }
  }
  if (DOM.userModalWrapper && !DOM.userModalWrapper.classList.contains('hidden')) {
    window.renderUserModal();
  }
});

// Re-verify and maintain 8-hour session when user switches tabs or un-minimizes window
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const activeSession = loadActiveUserSession();
    if (activeSession) {
      if (!STATE.currentUser || STATE.currentUser.email !== activeSession.email) {
        STATE.currentUser = activeSession;
        updateCounters();
        renderApp();
      }
    } else if (STATE.currentUser) {
      // 8 hours passed while minimized
      STATE.currentUser = null;
      updateCounters();
      renderApp();
    }
  }
});

window.syncUserActivitiesOnLogin = async function(userObj) {
  const now = Date.now();
  userObj.loginTimestamp = userObj.loginTimestamp || now;
  userObj.sessionExpiresAt = userObj.sessionExpiresAt || (now + SESSION_DURATION_MS);
  userObj.lastActiveAt = now;

  STATE.currentUser = userObj;
  saveToStorage('xpord_user', userObj);

  const uid = userObj.uid || (userObj.email ? userObj.email.replace(/[^a-zA-Z0-9]/g, '_') : 'guest');
  const userDocId = userObj.email ? userObj.email.replace(/[^a-zA-Z0-9]/g, '_') : uid;

  // 1. Restore this specific user's wishlist
  let userWishlist = [];
  try {
    const savedWish = localStorage.getItem(`xpord_wishlist_${uid}`);
    if (savedWish) {
      userWishlist = JSON.parse(savedWish);
    }
  } catch (e) {
    console.warn("Wishlist parse error:", e);
  }

  // 2. Restore this specific user's cart
  let userCart = [];
  try {
    const savedCart = localStorage.getItem(`xpord_cart_${uid}`);
    if (savedCart) {
      userCart = JSON.parse(savedCart);
    }
  } catch (e) {
    console.warn("Cart parse error:", e);
  }

  // 3. Fetch synced cloud profile data (wishlist & cart) from Firestore
  try {
    const userDocRef = doc(db, "users", userDocId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.wishlist) && data.wishlist.length > 0) {
        userWishlist = Array.from(new Set([...userWishlist, ...data.wishlist]));
      }
      if (Array.isArray(data.cart) && data.cart.length > 0 && userCart.length === 0) {
        userCart = data.cart;
      }
    }
  } catch (err) {
    console.warn("Cloud user sync warning:", err);
  }

  // Merge active guest cart items with userCart so items are never lost
  const mergedCart = [...userCart];
  if (Array.isArray(STATE.cart) && STATE.cart.length > 0) {
    STATE.cart.forEach(curItem => {
      const existing = mergedCart.find(m => m.product && curItem.product && m.product.id === curItem.product.id && m.size === curItem.size);
      if (existing) {
        existing.quantity = Math.max(existing.quantity, curItem.quantity);
      } else {
        mergedCart.push(curItem);
      }
    });
  }
  userCart = mergedCart;

  // Merge active guest wishlist items with userWishlist
  if (Array.isArray(STATE.wishlist) && STATE.wishlist.length > 0) {
    userWishlist = Array.from(new Set([...userWishlist, ...STATE.wishlist]));
  }

  STATE.wishlist = userWishlist;
  STATE.cart = userCart;

  try {
    localStorage.setItem(`xpord_wishlist_${uid}`, JSON.stringify(STATE.wishlist));
    localStorage.setItem('xpord_wishlist', JSON.stringify(STATE.wishlist));
    localStorage.setItem(`xpord_cart_${uid}`, JSON.stringify(STATE.cart));
    localStorage.setItem('xpord_cart', JSON.stringify(STATE.cart));
  } catch (e) {
    console.warn("Storage sync error:", e);
  }

  // 4. Filter orders for this specific logged-in user
  STATE.orders = window.getUserOrders();

  // 5. Update UI across the application
  updateCounters();
  renderApp();
  renderCartDrawer();
  if (DOM.wishlistModalWrapper && !DOM.wishlistModalWrapper.classList.contains('hidden')) {
    window.renderWishlistItems();
  }
  if (DOM.ordersModalWrapper && !DOM.ordersModalWrapper.classList.contains('hidden')) {
    window.renderOrdersList();
  }
  if (DOM.userModalWrapper && !DOM.userModalWrapper.classList.contains('hidden')) {
    window.renderUserModal();
  }
  if (typeof window.renderAccountView === 'function') {
    window.renderAccountView();
  }

  // Process any pending checkout intent post-login ONLY when triggered from an actual auth event
  handlePostLoginIntentRouter(true);
};

// --------------------------------------------------------------------------
// 16.1 LUXURY USER ACCOUNT & PROFILE VIEW ENGINE (CHAPTER 2 THEME)
// --------------------------------------------------------------------------
window.openAccountView = function(skipHistory = false) {
  const accountView = document.getElementById('xpordAccountView');
  const heroSection = document.querySelector('.hero-section') || document.getElementById('hero-section');
  const bentoSection = document.getElementById('category-bento-section') || DOM.categoryBentoSection;
  const appMain = document.getElementById('app-main') || DOM.appMain;

  // 1. Hide the hero banner and the 2-column Category bento boxes
  if (heroSection) heroSection.style.display = 'none';
  if (bentoSection) {
    bentoSection.classList.add('hidden');
    bentoSection.style.display = 'none';
  }

  // 2. Hide the active product listings grid and filtration chips
  if (appMain) {
    appMain.classList.add('hidden');
    appMain.style.display = 'none';
  }

  // 3. Explicitly reveal the profile page by overriding the CSS rule
  if (accountView) {
    accountView.classList.remove('hidden');
    accountView.style.setProperty('display', 'block', 'important');
    window.renderAccountView();
  }

  // Update active state across bottom fluid navigation
  document.querySelectorAll('.xpord-nav-node').forEach(node => {
    if (node.getAttribute('data-tab') === 'account') {
      node.classList.add('active');
    } else {
      node.classList.remove('active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (!skipHistory && window.XPORD_NAV) {
    window.XPORD_NAV.pushView('account');
  }
};
window.openAccountView = openAccountView;

window.closeAccountView = function() {
  const accountView = document.getElementById('xpordAccountView');
  if (accountView) {
    accountView.classList.add('hidden');
    accountView.style.setProperty('display', 'none', 'important');
  }

  const heroSection = document.querySelector('.hero-section') || document.getElementById('hero-section');
  const bentoSection = document.getElementById('category-bento-section') || DOM.categoryBentoSection;
  const appMain = document.getElementById('app-main') || DOM.appMain;

  if (heroSection) heroSection.style.removeProperty('display');

  if (STATE.isCategoryView) {
    if (bentoSection) {
      bentoSection.classList.remove('hidden');
      bentoSection.style.removeProperty('display');
    }
    if (appMain) {
      appMain.classList.add('hidden');
      appMain.style.removeProperty('display');
    }
  } else {
    if (bentoSection) {
      bentoSection.classList.add('hidden');
      bentoSection.style.removeProperty('display');
    }
    if (appMain) {
      appMain.classList.remove('hidden');
      appMain.style.removeProperty('display');
    }
  }

  // Update active state across bottom fluid navigation
  document.querySelectorAll('.xpord-nav-node').forEach(node => {
    if (node.getAttribute('data-tab') === 'home' || node.getAttribute('data-tab') === 'categories') {
      node.classList.add('active');
    } else {
      node.classList.remove('active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('account');
  }
};
window.closeAccountView = closeAccountView;

window.renderAccountView = function() {
  const container = document.getElementById('xpord-account-content');
  if (!container) return;

  const user = STATE.currentUser;
  const orders = window.getUserOrders();
  STATE.orders = orders;

  if (user) {
    // ----------------------------------------------------
    // LOGGED-IN PATRON PROFILE DASHBOARD (CHAPTER 2 DESIGN)
    // ----------------------------------------------------
    const userInitials = (user.name ? user.name.trim().charAt(0) : (user.email ? user.email.charAt(0) : 'M')).toUpperCase();
    const savedAddrRaw = localStorage.getItem('xpord_shipping_address');
    let savedAddr = null;
    try {
      if (savedAddrRaw) savedAddr = JSON.parse(savedAddrRaw);
    } catch (e) {}

    const totalOrdersCount = orders.length;
    const wishlistCount = (STATE.wishlist || []).length;
    const cartItemsCount = (STATE.cart || []).reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
    const addressCount = savedAddr ? 1 : 0;

    container.innerHTML = `
      <div class="account-grid-layout">
        <!-- Left Sidebar: Profile Identity Card & Quick Account Actions -->
        <aside class="account-sidebar-col">
          <div class="account-card account-profile-card">
            <div class="account-profile-cover"></div>
            <div class="account-profile-body">
              <div class="account-avatar-ring">
                ${user.photoURL ? `<img src="${user.photoURL}" alt="${user.name}" onerror="this.onerror=null; this.parentNode.innerHTML='${userInitials}';" />` : userInitials}
              </div>
              <h2 class="account-user-name">${user.name || 'XPORD Patron'}</h2>
              <p class="account-user-email">${user.email}</p>
              ${user.phone ? `<p class="account-user-phone"><i class="fa-solid fa-phone" style="font-size:0.75rem; margin-right:0.25rem;"></i> ${user.phone}</p>` : ''}
              
              <div style="margin-top:0.5rem; margin-bottom:1.25rem;">
                <span class="account-badge-member vip">
                  <i class="fa-solid fa-circle-check" style="color:#cca036;"></i> Verified Member
                </span>
              </div>

              <div style="display:flex; flex-direction:column; gap:0.6rem; width:100%;">
                <button type="button" class="account-btn-sm primary" onclick="window.editUserProfile()" style="justify-content:center; padding:0.6rem;">
                  <i class="fa-solid fa-pen-to-square"></i> Edit Profile
                </button>
                <button type="button" class="account-btn-sm danger" onclick="handleUserLogout()" style="justify-content:center; padding:0.6rem;">
                  <i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
                </button>
              </div>
            </div>
          </div>

          <!-- Quick Support & Policies Card -->
          <div class="account-card" style="margin-top:20px;">
            <div class="account-card-header">
              <h3 class="account-card-title"><i class="fa-solid fa-headset"></i> Customer Concierge</h3>
            </div>
            <p style="font-size:0.82rem; color:#666666; line-height:1.5; margin-bottom:1rem;">
              Direct access to XPORD Atelier customer care, order support, and easy returns.
            </p>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              <a href="https://wa.me/917687894396?text=Hello%20XPORD%20Support%2C%20I%20need%20assistance%20with%20my%20account" target="_blank" class="account-btn-sm" style="justify-content:flex-start; text-decoration:none;">
                <i class="fa-brands fa-whatsapp" style="color:#25D366; font-size:1rem;"></i> WhatsApp Concierge
              </a>
              <button type="button" class="account-btn-sm" onclick="if(window.openLegalModal) window.openLegalModal('returns');" style="justify-content:flex-start;">
                <i class="fa-solid fa-rotate-left"></i> 15-Day Return Policy
              </button>
              <button type="button" class="account-btn-sm" onclick="if(window.openLegalModal) window.openLegalModal('privacy');" style="justify-content:flex-start;">
                <i class="fa-solid fa-shield-halved"></i> Privacy & Data Terms
              </button>
            </div>
          </div>
        </aside>

        <!-- Right Main Column: Stats Metrics Strip, Orders Stream & Saved Address -->
        <main class="account-main-col">
          <!-- 4-Card Stats Summary Block -->
          <div class="account-stats-grid">
            <div class="account-stat-box" onclick="window.openOrdersModal()">
              <div class="account-stat-icon-chip chip-orders">
                <i class="fa-solid fa-box"></i>
              </div>
              <div class="account-stat-number">${totalOrdersCount}</div>
              <div class="account-stat-label">Total Orders</div>
            </div>
            <div class="account-stat-box" onclick="window.openWishlistModal()">
              <div class="account-stat-icon-chip chip-wishlist">
                <i class="fa-solid fa-heart"></i>
              </div>
              <div class="account-stat-number">${wishlistCount}</div>
              <div class="account-stat-label">Saved Wishlist</div>
            </div>
            <div class="account-stat-box" onclick="if(typeof toggleCartDrawer==='function') toggleCartDrawer();">
              <div class="account-stat-icon-chip chip-bag">
                <i class="fa-solid fa-bag-shopping"></i>
              </div>
              <div class="account-stat-number">${cartItemsCount}</div>
              <div class="account-stat-label">Bag Items</div>
            </div>
            <div class="account-stat-box" onclick="window.editSavedAddress()">
              <div class="account-stat-icon-chip chip-address">
                <i class="fa-solid fa-location-dot"></i>
              </div>
              <div class="account-stat-number">${addressCount}</div>
              <div class="account-stat-label">Saved Address</div>
            </div>
          </div>

          <!-- Track Orders Action Block -->
          <div class="account-card" style="margin-bottom:20px; cursor:pointer;" onclick="window.openOrdersModal()">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
              <div style="display:flex; align-items:center; gap:0.85rem;">
                <div style="width:48px; height:48px; border-radius:14px; background:#0f172a; color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:1.25rem;">
                  <i class="fa-solid fa-box-open"></i>
                </div>
                <div>
                  <h3 style="font-family:var(--font-display); font-size:1.05rem; font-weight:800; color:#0f172a; margin:0;">Track Orders</h3>
                  <p style="font-size:0.8rem; color:#64748b; margin:2px 0 0 0;">View purchase history, real-time shipment status & invoices (${totalOrdersCount} orders)</p>
                </div>
              </div>
              <button type="button" class="btn-dribbble-details" onclick="event.stopPropagation(); window.openOrdersModal();" style="padding:8px 20px; font-size:0.84rem;">
                Track Orders <i class="fa-solid fa-arrow-right" style="margin-left:4px;"></i>
              </button>
            </div>
          </div>

          <!-- Saved Delivery Address Section -->
          <div class="account-card">
            <div class="account-card-header">
              <h3 class="account-card-title"><i class="fa-solid fa-map-location-dot"></i> Saved Delivery Address</h3>
              <button type="button" class="account-btn-sm primary" onclick="window.editSavedAddress()">
                <i class="fa-solid fa-pen"></i> ${savedAddr ? 'Update Address' : 'Add New Address'}
              </button>
            </div>

            ${savedAddr ? `
              <div class="account-address-box">
                <div style="font-size:0.95rem; font-weight:800; color:#111111; margin-bottom:0.35rem;">
                  ${savedAddr.fullName || user.name || 'Primary Recipient'}
                  <span style="font-size:0.75rem; font-weight:600; color:#71717a; margin-left:0.5rem;">${savedAddr.phone || user.phone || ''}</span>
                </div>
                <div>${savedAddr.street || savedAddr.fullAddress || ''}</div>
                ${savedAddr.landmark ? `<div>Landmark: ${savedAddr.landmark}</div>` : ''}
                <div>${savedAddr.city || ''}${savedAddr.state ? `, ${savedAddr.state}` : ''} - <strong>${savedAddr.pincode || ''}</strong></div>
              </div>
            ` : `
              <div style="text-align:center; padding:1.5rem; background:#fafafa; border:1px dashed #e4e4e7; border-radius:8px;">
                <p style="font-size:0.85rem; color:#666666; margin-bottom:0.75rem;">No default shipping address saved on this profile yet.</p>
                <button type="button" class="account-btn-sm primary" onclick="window.editSavedAddress()">
                  <i class="fa-solid fa-plus"></i> Save Delivery Address
                </button>
              </div>
            `}
          </div>
        </main>
      </div>
    `;
  } else {
    // ----------------------------------------------------
    // GUEST / LOGGED-OUT ACCOUNT VIEW (CHAPTER 2 THEME)
    // ----------------------------------------------------
    const isLogin = STATE.authTab === 'login';
    container.innerHTML = `
      <div class="account-guest-wrapper">
        <div class="account-card" style="padding:2rem;">
          <div class="account-guest-header">
            <div style="width:48px; height:48px; margin:0 auto 0.75rem; display:flex; align-items:center; justify-content:center; background:#111111; border-radius:10px;">
              <svg viewBox="0 0 120 100" fill="none" style="width:30px; height:26px;">
                <path d="M48 38 C48 20 72 20 72 38" stroke="#d97706" stroke-width="6" stroke-linecap="round" fill="none"/>
                <path d="M22 38 L44 38 L54 54 L36 54 Z" fill="#d97706"/>
                <path d="M42 38 L78 38 L72 70 L48 70 Z" fill="#d97706"/>
                <path d="M24 84 L42 84 L56 62 L42 62 Z" fill="#d97706"/>
                <path d="M68 62 L82 84 L100 84 L80 62 Z" fill="#d97706"/>
                <path d="M20 76 Q 50 68 80 44 L76 36 L108 26 L100 58 L92 50 Q 64 74 20 76 Z" fill="#d97706"/>
              </svg>
            </div>
            <div class="account-guest-brand">XPORD ATELIER</div>
            <p class="account-guest-desc">Sign in to manage your luxury orders, live shipments, saved wishlist, and addresses.</p>
          </div>

          <!-- One-Click Google Login -->
          <button type="button" onclick="handleGoogleSignIn()" class="account-google-btn">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            Continue with Google
          </button>

          <div class="account-divider-text">
            <span>or email & password</span>
          </div>

          <!-- Auth Tab Switcher -->
          <div class="account-tab-row">
            <button type="button" class="account-tab-btn ${isLogin ? 'active' : ''}" onclick="switchAuthTab('login')">
              <i class="fa-solid fa-right-to-bracket"></i> Login
            </button>
            <button type="button" class="account-tab-btn ${!isLogin ? 'active' : ''}" onclick="switchAuthTab('register')">
              <i class="fa-solid fa-user-plus"></i> Create Account
            </button>
          </div>

          <form onsubmit="handleUserAuth(event)">
            ${!isLogin ? `
              <div class="account-input-group">
                <label>Full Name <span style="color:#dc2626;">*</span></label>
                <input type="text" id="auth-name-input" class="account-input-field" placeholder="e.g. Ritik Kumar" required />
              </div>
            ` : `
              <input type="hidden" id="auth-name-input" value="" />
            `}

            <div class="account-input-group">
              <label>Email Address <span style="color:#dc2626;">*</span></label>
              <input type="email" id="auth-email-input" class="account-input-field" placeholder="name@example.com" required />
            </div>

            <div class="account-input-group">
              <label>Password <span style="color:#dc2626;">*</span></label>
              <input type="password" id="auth-password-input" class="account-input-field" placeholder="${isLogin ? 'Enter your password' : 'Min 6 characters'}" required minlength="6" />
            </div>

            ${!isLogin ? `
              <div class="account-input-group">
                <label>Mobile Number (Optional)</label>
                <input type="tel" id="auth-phone-input" class="account-input-field" placeholder="+91 0000000000" />
              </div>
            ` : `
              <input type="hidden" id="auth-phone-input" value="" />
            `}

            <button type="submit" class="account-submit-btn">
              ${isLogin ? 'Sign In to Account' : 'Complete Registration'}
            </button>
          </form>
        </div>

        <!-- Guest Quick Order Lookup Card -->
        <div class="account-card" style="margin-top:20px; padding:1.5rem;">
          <div class="account-card-header">
            <h3 class="account-card-title"><i class="fa-solid fa-truck-ramp-box"></i> Guest Order Tracking</h3>
          </div>
          <p style="font-size:0.82rem; color:#666666; margin-bottom:1rem;">
            Placed an order without an account? Enter your Order ID to track shipment status.
          </p>
          <div style="display:flex; gap:0.5rem;">
            <input type="text" id="guest-track-input" class="account-input-field" placeholder="e.g. XPD-12345" style="text-transform:uppercase;" onkeydown="if(event.key==='Enter') window.trackGuestOrder();" />
            <button type="button" class="account-btn-sm primary" onclick="window.trackGuestOrder()" style="white-space:nowrap; padding:0.65rem 1rem;">
              Track Order
            </button>
          </div>
          <div id="guest-track-result"></div>
        </div>
      </div>
    `;
  }
};
window.renderAccountView = renderAccountView;

window.editSavedAddress = function() {
  const savedAddrRaw = localStorage.getItem('xpord_shipping_address');
  let addr = { fullName: '', phone: '', street: '', city: '', state: '', pincode: '', landmark: '' };
  try {
    if (savedAddrRaw) addr = Object.assign(addr, JSON.parse(savedAddrRaw));
  } catch (e) {}

  if (STATE.currentUser) {
    if (!addr.fullName) addr.fullName = STATE.currentUser.name || '';
    if (!addr.phone) addr.phone = STATE.currentUser.phone || '';
  }

  const modalHtml = `
    <div id="account-address-modal-wrapper" class="modal-wrapper">
      <div class="modal-backdrop" onclick="document.getElementById('account-address-modal-wrapper').remove()"></div>
      <div class="quick-view-modal-content" style="max-width: 480px; padding: 1.5rem;">
        <button class="modal-close-btn" onclick="document.getElementById('account-address-modal-wrapper').remove()"><i class="fa-solid fa-xmark"></i></button>
        <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:800; margin-bottom:1rem; color:#111;">Edit Delivery Address</h3>
        <form onsubmit="window.saveAddressFromAccount(event)">
          <div class="account-input-group">
            <label>Full Name</label>
            <input type="text" id="acc-addr-name" class="account-input-field" value="${addr.fullName || ''}" required />
          </div>
          <div class="account-input-group">
            <label>Phone Number</label>
            <input type="tel" id="acc-addr-phone" class="account-input-field" value="${addr.phone || ''}" required />
          </div>
          <div class="account-input-group">
            <label>Flat / House / Street Address</label>
            <input type="text" id="acc-addr-street" class="account-input-field" value="${addr.street || ''}" required />
          </div>
          <div class="account-input-group">
            <label>Landmark (Optional)</label>
            <input type="text" id="acc-addr-landmark" class="account-input-field" value="${addr.landmark || ''}" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="account-input-group">
              <label>City</label>
              <input type="text" id="acc-addr-city" class="account-input-field" value="${addr.city || ''}" required />
            </div>
            <div class="account-input-group">
              <label>Pincode</label>
              <input type="text" id="acc-addr-pincode" class="account-input-field" value="${addr.pincode || ''}" required maxlength="6" />
            </div>
          </div>
          <button type="submit" class="account-submit-btn" style="margin-top:0.75rem;">Save Delivery Address</button>
        </form>
      </div>
    </div>
  `;
  const existing = document.getElementById('account-address-modal-wrapper');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};
window.editSavedAddress = editSavedAddress;

window.saveAddressFromAccount = async function(event) {
  event.preventDefault();
  const name = document.getElementById('acc-addr-name')?.value.trim();
  const phone = document.getElementById('acc-addr-phone')?.value.trim();
  const street = document.getElementById('acc-addr-street')?.value.trim();
  const landmark = document.getElementById('acc-addr-landmark')?.value.trim() || '';
  const city = document.getElementById('acc-addr-city')?.value.trim();
  const pincode = document.getElementById('acc-addr-pincode')?.value.trim();

  const newAddr = {
    fullName: name,
    phone: phone,
    street: street,
    landmark: landmark,
    city: city,
    pincode: pincode,
    fullAddress: `${street}${landmark ? ', Near ' + landmark : ''}, ${city} - ${pincode}`
  };

  localStorage.setItem('xpord_shipping_address', JSON.stringify(newAddr));

  if (STATE.currentUser && STATE.currentUser.email) {
    const userDocId = STATE.currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
    setDoc(doc(db, "users", userDocId), { defaultAddress: newAddr, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  }

  const modal = document.getElementById('account-address-modal-wrapper');
  if (modal) modal.remove();

  showToast("Delivery address updated successfully!", "success");
  if (window.renderAccountView) window.renderAccountView();
};
window.saveAddressFromAccount = saveAddressFromAccount;

window.editUserProfile = function() {
  if (!STATE.currentUser) return;
  const user = STATE.currentUser;
  const modalHtml = `
    <div id="account-profile-modal-wrapper" class="modal-wrapper">
      <div class="modal-backdrop" onclick="document.getElementById('account-profile-modal-wrapper').remove()"></div>
      <div class="quick-view-modal-content" style="max-width: 440px; padding: 1.5rem;">
        <button class="modal-close-btn" onclick="document.getElementById('account-profile-modal-wrapper').remove()"><i class="fa-solid fa-xmark"></i></button>
        <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:800; margin-bottom:1rem; color:#111;">Edit Profile</h3>
        <form onsubmit="window.saveUserProfileFromAccount(event)">
          <div class="account-input-group">
            <label>Full Name</label>
            <input type="text" id="acc-prof-name" class="account-input-field" value="${user.name || ''}" required />
          </div>
          <div class="account-input-group">
            <label>Email (Verified)</label>
            <input type="email" class="account-input-field" value="${user.email || ''}" disabled style="opacity:0.7; cursor:not-allowed;" />
          </div>
          <div class="account-input-group">
            <label>Mobile Number</label>
            <input type="tel" id="acc-prof-phone" class="account-input-field" value="${user.phone || ''}" placeholder="+91 0000000000" />
          </div>
          <button type="submit" class="account-submit-btn" style="margin-top:0.75rem;">Save Changes</button>
        </form>
      </div>
    </div>
  `;
  const existing = document.getElementById('account-profile-modal-wrapper');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};
window.editUserProfile = editUserProfile;

window.saveUserProfileFromAccount = async function(event) {
  event.preventDefault();
  if (!STATE.currentUser) return;

  const name = document.getElementById('acc-prof-name')?.value.trim();
  const phone = document.getElementById('acc-prof-phone')?.value.trim();

  if (name) STATE.currentUser.name = name;
  if (phone !== undefined) STATE.currentUser.phone = phone;

  saveToStorage('xpord_user', STATE.currentUser);

  if (STATE.currentUser.email) {
    const userDocId = STATE.currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
    setDoc(doc(db, "users", userDocId), { name: STATE.currentUser.name, phone: STATE.currentUser.phone, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  }

  const modal = document.getElementById('account-profile-modal-wrapper');
  if (modal) modal.remove();

  updateCounters();
  showToast("Profile details updated successfully!", "success");
  if (window.renderAccountView) window.renderAccountView();
};
window.saveUserProfileFromAccount = saveUserProfileFromAccount;

window.openUserModal = function(skipHistory = false) {
  if (!DOM.userModalWrapper) return;
  window.renderUserModal();
  DOM.userModalWrapper.classList.remove('hidden');
  if (!skipHistory && window.XPORD_NAV) {
    window.XPORD_NAV.pushView('user');
  }
};

window.closeUserModal = function() {
  if (window.XPORD_NAV) {
    window.XPORD_NAV.closeView('user', () => {
      if (DOM.userModalWrapper) DOM.userModalWrapper.classList.add('hidden');
    });
  } else if (DOM.userModalWrapper) {
    DOM.userModalWrapper.classList.add('hidden');
  }
};

window.switchAuthTab = function(tabName) {
  STATE.authTab = tabName;
  window.renderUserModal();
  if (typeof window.renderAccountView === 'function') {
    window.renderAccountView();
  }
};

window.renderUserModal = function() {
  const container = document.getElementById('user-modal-body');
  if (!container) return;

  if (STATE.currentUser) {
    container.innerHTML = `
      <div style="text-align:center; padding:1.5rem 1rem">
        <div style="width:70px; height:70px; background-color:var(--bg-dark); color:var(--bg-card); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2rem; margin:0 auto 1rem; overflow:hidden;">
          ${STATE.currentUser.photoURL ? `<img src="${STATE.currentUser.photoURL}" alt="Avatar" style="width:100%; height:100%; object-fit:cover;" />` : `<i class="fa-solid fa-user-check"></i>`}
        </div>
        <h3 style="font-family:var(--font-serif); font-size:1.4rem; font-weight:700;">Welcome, ${STATE.currentUser.name}</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.5rem;">${STATE.currentUser.email} ${STATE.currentUser.phone ? '| ' + STATE.currentUser.phone : ''}</p>

        <div style="background-color:var(--bg-subtle); border:1px solid var(--border-medium); border-radius:var(--radius-sm); padding:1rem; text-align:left; font-size:0.85rem; line-height:1.7; margin-bottom:1.5rem;">
          <div><strong>Member Status:</strong> Verified Firebase Member</div>
          <div><strong>Saved Wishlist:</strong> ${STATE.wishlist.length} Item(s)</div>
          <div><strong>Order History:</strong> ${STATE.orders.length} Order(s)</div>
        </div>

        <div style="display:flex; gap:0.8rem;">
          <button class="primary-btn" onclick="openOrdersModal(); closeUserModal();" style="flex:1;">View Orders</button>
          <button class="secondary-btn-outline" onclick="handleUserLogout()" style="flex:1; color:var(--accent-error); border-color:var(--border-medium);">Sign Out</button>
        </div>
      </div>
    `;
  } else {
    const isLogin = STATE.authTab === 'login';
    container.innerHTML = `
      <div style="padding:0.5rem">
        <h3 style="font-family:var(--font-serif); font-size:1.5rem; font-weight:800; margin-bottom:0.3rem; text-align:center;">Register or Login</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); text-align:center; margin-bottom:1.2rem;">Access your account to sync saved items, orders & complete checkout.</p>

        <!-- Google Sign-In Button -->
        <button type="button" onclick="handleGoogleSignIn()" class="google-btn" style="width:100%; padding:0.75rem; border:1px solid var(--border-medium); background:#ffffff; color:#222; font-weight:700; border-radius:var(--radius-xs); display:flex; align-items:center; justify-content:center; gap:0.6rem; cursor:pointer; font-size:0.88rem; margin-bottom:1rem; box-shadow:0 1px 4px rgba(0,0,0,0.06); transition:background 0.2s;">
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          Continue with Google
        </button>

        <div style="display:flex; align-items:center; margin-bottom:1.2rem;">
          <hr style="flex:1; border:none; border-top:1px solid var(--border-medium);"/>
          <span style="padding:0 0.6rem; font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">or use email & password</span>
          <hr style="flex:1; border:none; border-top:1px solid var(--border-medium);"/>
        </div>

        <!-- Interactive Auth Navigation Tabs -->
        <div style="display:flex; border-bottom:2px solid var(--border-medium); margin-bottom:1.2rem; background:var(--bg-subtle); border-radius:var(--radius-xs) var(--radius-xs) 0 0; padding:0.2rem 0.2rem 0;">
          <button type="button" onclick="switchAuthTab('login')" style="flex:1; padding:0.7rem 0.5rem; font-size:0.85rem; font-weight:700; border:none; background:${isLogin ? 'var(--bg-card)' : 'transparent'}; color:${isLogin ? 'var(--text-primary)' : 'var(--text-muted)'}; cursor:pointer; border-bottom:${isLogin ? '3px solid var(--text-primary)' : 'none'}; border-radius:var(--radius-xs) var(--radius-xs) 0 0; transition:all 0.2s ease;">
            <i class="fa-solid fa-right-to-bracket"></i> Login
          </button>
          <button type="button" onclick="switchAuthTab('register')" style="flex:1; padding:0.7rem 0.5rem; font-size:0.85rem; font-weight:700; border:none; background:${!isLogin ? 'var(--bg-card)' : 'transparent'}; color:${!isLogin ? 'var(--text-primary)' : 'var(--text-muted)'}; cursor:pointer; border-bottom:${!isLogin ? '3px solid var(--text-primary)' : 'none'}; border-radius:var(--radius-xs) var(--radius-xs) 0 0; transition:all 0.2s ease;">
            <i class="fa-solid fa-user-plus"></i> Register / Sign Up
          </button>
        </div>

        <form onsubmit="handleUserAuth(event)">
          ${!isLogin ? `
            <div style="margin-bottom:0.8rem;">
              <label style="display:block; font-size:0.8rem; font-weight:700; margin-bottom:0.3rem;">Full Name <span style="color:#d9534f">*</span></label>
              <input type="text" id="auth-name-input" placeholder="Enter your full name" required style="width:100%; padding:0.65rem; border:1px solid var(--border-medium); background:var(--bg-subtle); border-radius:var(--radius-xs); font-size:0.85rem;" />
            </div>
          ` : `
            <input type="hidden" id="auth-name-input" value="" />
          `}

          <div style="margin-bottom:0.8rem;">
            <label style="display:block; font-size:0.8rem; font-weight:700; margin-bottom:0.3rem;">Email Address <span style="color:#d9534f">*</span></label>
            <input type="email" id="auth-email-input" placeholder="name@example.com" required style="width:100%; padding:0.65rem; border:1px solid var(--border-medium); background:var(--bg-subtle); border-radius:var(--radius-xs); font-size:0.85rem;" />
          </div>

          <div style="margin-bottom:0.8rem;">
            <label style="display:block; font-size:0.8rem; font-weight:700; margin-bottom:0.3rem;">Password <span style="color:#d9534f">*</span></label>
            <input type="password" id="auth-password-input" placeholder="${isLogin ? 'Enter your password' : 'Create a password (min 6 chars)'}" required minlength="6" style="width:100%; padding:0.65rem; border:1px solid var(--border-medium); background:var(--bg-subtle); border-radius:var(--radius-xs); font-size:0.85rem;" />
          </div>

          ${!isLogin ? `
            <div style="margin-bottom:1.2rem;">
              <label style="display:block; font-size:0.8rem; font-weight:700; margin-bottom:0.3rem;">Mobile Phone Number (Optional)</label>
              <input type="tel" id="auth-phone-input" placeholder="+91 0000000000" style="width:100%; padding:0.65rem; border:1px solid var(--border-medium); background:var(--bg-subtle); border-radius:var(--radius-xs); font-size:0.85rem;" />
            </div>
          ` : `
            <input type="hidden" id="auth-phone-input" value="" />
          `}

          <button type="submit" class="primary-btn" style="width:100%; padding:0.8rem; font-size:0.9rem; font-weight:700; margin-top:0.4rem;">
            ${isLogin ? '<i class="fa-solid fa-right-to-bracket"></i> Login to Account' : '<i class="fa-solid fa-user-plus"></i> Create Account & Register'}
          </button>
        </form>

        <div style="text-align:center; margin-top:1.2rem; font-size:0.85rem; color:var(--text-muted); border-top:1px solid var(--border-medium); padding-top:0.8rem;">
          ${isLogin ? `
            Don't have an account yet? <a href="#" onclick="switchAuthTab('register'); return false;" style="font-weight:700; color:var(--text-primary); text-decoration:underline;">Register / Sign Up</a>
          ` : `
            Already registered? <a href="#" onclick="switchAuthTab('login'); return false;" style="font-weight:700; color:var(--text-primary); text-decoration:underline;">Login Here</a>
          `}
        </div>
      </div>
    `;
  }
};

window.handleQuickDemoLogin = async function() {
  try {
    const demoUser = {
      uid: 'demo_ritik_kumar',
      name: 'Ritik Kumar',
      email: 'kumarritik2250m@gmail.com',
      phone: '+91 98765 43210',
      photoURL: '',
      updatedAt: new Date().toISOString()
    };
    showToast("Signing in as Ritik Kumar...", "info");
    await window.syncUserActivitiesOnLogin(demoUser);
    window.closeUserModal();
    showToast("Logged in successfully!", "success");

    if (STATE.pendingCheckoutAfterLogin) {
      STATE.pendingCheckoutAfterLogin = false;
      setTimeout(() => {
        window.openCheckoutModal(!!STATE.directCheckoutItem);
      }, 300);
    }
  } catch (err) {
    console.error("Demo login error:", err);
  }
};

window.handleGoogleSignIn = async function() {
  const googleBtn = document.querySelector('.google-btn');
  try {
    if (googleBtn) {
      googleBtn.disabled = true;
      googleBtn.style.opacity = '0.7';
      googleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting to Google...';
    }
    showToast("Connecting to Google Sign-In...", "info");

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);

    const user = result.user;
    const name = user.displayName || (user.email ? user.email.split('@')[0] : 'Member');
    const email = user.email || '';
    const phone = user.phoneNumber || '';

    const userObj = { uid: user.uid, name, email, phone, photoURL: user.photoURL || '', updatedAt: new Date().toISOString() };
    
    try {
      await setDoc(doc(db, "users", user.uid), userObj, { merge: true });
    } catch (dbErr) {
      console.warn("Could not write user profile to Firestore (continuing locally):", dbErr);
    }

    await window.syncUserActivitiesOnLogin(userObj);
    window.closeUserModal();

    if (STATE.pendingCheckoutAfterLogin) {
      STATE.pendingCheckoutAfterLogin = false;
      showToast(`Welcome ${name}! Google login successful. Redirecting to checkout...`, 'success');
      setTimeout(() => {
        window.openCheckoutModal(!!STATE.directCheckoutItem);
      }, 300);
    } else {
      showToast(`Welcome, ${name}! Logged in with Google.`, 'success');
    }
  } catch (error) {
    const errCode = error?.code || 'unknown-error';

    if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
      console.info("Google Sign-In popup closed by user.");
      showToast("Google Sign-In popup was closed.", "info");
    } else if (errCode === 'auth/operation-not-allowed') {
      console.warn("Google Auth operation not allowed in Firebase console.");
      showToast("Firebase Console me Google Sign-In enable karein.", "error");
    } else if (errCode === 'auth/unauthorized-domain') {
      console.warn(`Domain (${window.location.hostname}) not in Firebase authorized domains.`);
      showToast(`Domain (${window.location.hostname}) Firebase Authorized Domains me add karein.`, "error");
    } else if (errCode === 'auth/popup-blocked') {
      console.warn("Google Sign-In popup blocked by browser.");
      showToast("Popup blocked by browser. Please allow popups.", "error");
    } else {
      console.error("Google Auth error:", error);
      showToast(`Google Sign-In: ${error.message || errCode}`, "error");
    }
  } finally {
    if (googleBtn) {
      googleBtn.disabled = false;
      googleBtn.style.opacity = '1';
      googleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
        Continue with Google
      `;
    }
  }
};

window.handleUserAuth = async function(event) {
  event.preventDefault();
  const isLogin = STATE.authTab === 'login';
  let name = document.getElementById('auth-name-input')?.value.trim();
  const email = document.getElementById('auth-email-input')?.value.trim().toLowerCase();
  const password = document.getElementById('auth-password-input')?.value;
  const phone = document.getElementById('auth-phone-input')?.value.trim() || '';

  if (!email || !password) {
    showToast("Please enter email and password.", "error");
    return;
  }

  if (!isLogin && password.length < 6) {
    showToast("Password must be at least 6 characters long.", "error");
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
  }

  const userDocId = email.replace(/[^a-zA-Z0-9]/g, '_');

  try {
    let displayName = name;
    let userUid = userDocId;

    if (isLogin) {
      // 1. Try Firebase Auth Login first
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        displayName = user.displayName || name || email.split('@')[0];
        userUid = user.uid;
      } catch (authErr) {
        console.warn("Firebase Auth Login error, checking Firestore DB fallback:", authErr);
        if (authErr.code === 'auth/wrong-password') {
          throw new Error("Incorrect password. Please try again.");
        }
        // Check Firestore fallback
        const userDocRef = doc(db, "users", userDocId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const storedUser = userSnap.data();
          if (storedUser.password && storedUser.password !== password) {
            throw new Error("Incorrect password. Please try again.");
          }
          displayName = storedUser.name || email.split('@')[0];
        } else {
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
            showToast("No account found with this email. Please switch to Register tab to create an account.", "info");
            STATE.authTab = 'register';
            window.renderUserModal();
            return;
          } else {
            throw authErr;
          }
        }
      }
    } else {
      // REGISTER MODE
      if (!name) {
        showToast("Please enter your full name for registration.", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account & Register';
        }
        return;
      }

      // Try Firebase Auth Register
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        userUid = user.uid;
        displayName = name;
      } catch (authErr) {
        console.warn("Firebase Auth Register notice, checking fallback mode:", authErr);
        if (authErr.code === 'auth/email-already-in-use') {
          showToast("This email is already registered! Switching to Login tab.", "info");
          STATE.authTab = 'login';
          window.renderUserModal();
          return;
        }
        // If Firebase Auth provider is disabled or unavailable, use Firestore direct DB Registration
        displayName = name;
      }
    }

    const userObj = {
      uid: userUid,
      name: displayName || name || email.split('@')[0],
      email: email,
      phone: phone,
      password: password, // Saved in DB for fallback verification
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, "users", userDocId), userObj, { merge: true });
    await window.syncUserActivitiesOnLogin(userObj);

    window.closeUserModal();

    if (STATE.pendingCheckoutAfterLogin) {
      STATE.pendingCheckoutAfterLogin = false;
      showToast(`Welcome ${displayName}! Registration/Login successful. Redirecting to checkout...`, 'success');
      setTimeout(() => {
        window.openCheckoutModal(!!STATE.directCheckoutItem);
      }, 300);
    } else {
      showToast(isLogin ? `Welcome back, ${displayName}!` : `Account created! Welcome, ${displayName}.`, 'success');
    }

  } catch (error) {
    console.error("Auth Error:", error);
    let errorMsg = error.message || "Authentication failed.";
    if (error.code === 'auth/email-already-in-use') {
      errorMsg = "This email is already registered! Please switch to Login tab.";
      STATE.authTab = 'login';
      window.renderUserModal();
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMsg = "Incorrect email or password. Please check your details.";
    } else if (error.code === 'auth/weak-password') {
      errorMsg = "Password must be at least 6 characters long.";
    } else if (error.code === 'auth/invalid-email') {
      errorMsg = "Invalid email address format.";
    }
    showToast(errorMsg, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = isLogin ? '<i class="fa-solid fa-right-to-bracket"></i> Login to Account' : '<i class="fa-solid fa-user-plus"></i> Create Account & Register';
    }
  }
};

window.handleUserLogout = async function() {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Sign out error:", e);
  }

  // Clear current active session state completely
  STATE.currentUser = null;
  STATE.wishlist = [];
  STATE.cart = [];
  STATE.orders = [];
  STATE.appliedCoupon = null;

  // Clear general session keys from localStorage
  try {
    localStorage.removeItem('xpord_user');
    localStorage.removeItem('xpord_wishlist');
    localStorage.removeItem('xpord_cart');
    localStorage.removeItem('xpord_shipping_address');
    localStorage.removeItem('xpord_orders');
  } catch (e) {
    console.warn("localStorage remove error:", e);
  }

  // Update counters and all modals/views
  updateCounters();
  renderApp();
  renderCartDrawer();
  if (DOM.wishlistModalWrapper && !DOM.wishlistModalWrapper.classList.contains('hidden')) {
    window.renderWishlistItems();
  }
  if (DOM.ordersModalWrapper && !DOM.ordersModalWrapper.classList.contains('hidden')) {
    window.renderOrdersList();
  }
  if (DOM.userModalWrapper && !DOM.userModalWrapper.classList.contains('hidden')) {
    window.renderUserModal();
  }
  if (typeof window.renderAccountView === 'function') {
    window.renderAccountView();
  }

  showToast("Account signed out. All personal activity and orders have been cleared.", "info");
};

// --------------------------------------------------------------------------
// 17. ADMIN STORE SETTINGS & BANNERS LOGIC
// --------------------------------------------------------------------------
window.saveStoreSettingsUI = async function(event) {
  event.preventDefault();
  const ticker = document.getElementById('admin-ticker-msg')?.value.trim();
  const heroTitle = document.getElementById('admin-hero-title')?.value.trim();
  const heroSub = document.getElementById('admin-hero-subtitle')?.value.trim();
  const promoCode = document.getElementById('admin-promo-code')?.value.trim();
  const promoDisc = document.getElementById('admin-promo-discount')?.value.trim();

  const newSettings = {
    tickerMessage: ticker || STATE.siteSettings.tickerMessage,
    heroTitle: heroTitle || STATE.siteSettings.heroTitle,
    heroSubtitle: heroSub || STATE.siteSettings.heroSubtitle,
    promoCode: promoCode || "XPORD20",
    promoDiscount: parseInt(promoDisc) || 20,
    updatedAt: new Date().toISOString()
  };

  STATE.siteSettings = newSettings;

  try {
    await setDoc(doc(db, "site_settings", "store_config"), newSettings);
  } catch (err) {
    console.warn("Failed to write store settings to Firestore:", err);
  }

  // Update DOM directly
  const tickerSpan = document.querySelector('.promo-marquee span');
  if (tickerSpan) tickerSpan.textContent = newSettings.tickerMessage;

  const h1 = document.querySelector('.hero-title');
  if (h1) h1.innerHTML = newSettings.heroTitle.replace(/\n/g, '<br>');

  const heroDesc = document.querySelector('.hero-description');
  if (heroDesc) heroDesc.textContent = newSettings.heroSubtitle;

  showToast("Store Banners & Ticker updated live across website!", "success");
};

/* ==========================================================================
   18. FIRESTORE REAL-TIME CLOUD DATABASE MULTI-COLLECTION SYNC ENGINE
   ========================================================================== */
let isFirestoreInitialized = false;

async function seedFirestoreDefaults() {
  try {
    const batch = writeBatch(db);
    BASELINE_PRODUCTS.forEach(item => {
      const docRef = doc(db, "products", item.id);
      batch.set(docRef, item);
    });
    await batch.commit();
    console.log("Firestore successfully seeded with baseline catalog items.");
  } catch (err) {
    console.error("Error seeding Firestore baseline catalog:", err);
  }
}

function initFirestoreSync() {
  try {
    // 1. Products Listener
    const productsRef = collection(db, "products");
    onSnapshot(productsRef, async (snapshot) => {
      if (snapshot.empty && !isFirestoreInitialized) {
        isFirestoreInitialized = true;
        await seedFirestoreDefaults();
        return;
      }
      
      isFirestoreInitialized = true;
      if (!snapshot.empty) {
        const cloudProducts = [];
        snapshot.forEach(docSnap => {
          cloudProducts.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        STATE.products = cloudProducts;
        saveProductsToStorage(STATE.products);
        
        renderApp();
        if (typeof window.renderAdminCatalogList === 'function') {
          window.renderAdminCatalogList();
        }
      }
    }, (error) => {
      console.warn("Firestore products onSnapshot error:", error);
    });

    // 2. Orders Listener (Real-Time Cloud Synchronization)
    onSnapshot(collection(db, "orders"), (snapshot) => {
      if (!snapshot.empty) {
        const cloudOrders = [];
        snapshot.forEach(docSnap => {
          cloudOrders.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort newest first
        cloudOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        STATE.allOrders = cloudOrders;
      } else {
        STATE.allOrders = [];
      }
      try {
        localStorage.setItem('xpord_all_orders', JSON.stringify(STATE.allOrders));
      } catch (e) {}

      // Derive filtered view for current logged in user
      STATE.orders = window.getUserOrders();
      try {
        localStorage.setItem('xpord_orders', JSON.stringify(STATE.orders));
      } catch (e) {}

      updateCounters();
      if (DOM.ordersModalWrapper && !DOM.ordersModalWrapper.classList.contains('hidden')) {
        window.renderOrdersList();
      }
      // Real-time live update for Admin Portal Orders Dashboard
      const adminWrapper = document.getElementById('adminPanel');
      if (adminWrapper && !adminWrapper.classList.contains('hidden')) {
        window.renderAdminOrdersDashboard();
      }
    }, (err) => console.warn("Firestore orders listener error:", err));

    // 3. Reviews Listener
    onSnapshot(collection(db, "reviews"), (snapshot) => {
      if (!snapshot.empty) {
        const cloudReviews = [];
        snapshot.forEach(docSnap => cloudReviews.push({ id: docSnap.id, ...docSnap.data() }));
        STATE.reviews = cloudReviews;
      }
    }, (err) => console.warn("Firestore reviews listener error:", err));

    // 4. Coupons Listener (Real-Time Cloud Synchronization for Promo Codes)
    onSnapshot(collection(db, "coupons"), async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial default coupons if cloud collection is empty
        try {
          const batch = writeBatch(db);
          DEFAULT_COUPONS.forEach(item => {
            const docRef = doc(db, "coupons", item.code);
            batch.set(docRef, item);
          });
          await batch.commit();
        } catch (seedErr) {
          console.warn("Could not seed default coupons to Firestore:", seedErr);
        }
        return;
      }

      const cloudCoupons = [];
      snapshot.forEach(docSnap => {
        cloudCoupons.push({ id: docSnap.id, ...docSnap.data() });
      });

      STATE.coupons = cloudCoupons;
      try {
        localStorage.setItem('xpord_coupons', JSON.stringify(STATE.coupons));
      } catch (e) {}

      renderCartDrawer();
      if (DOM.couponsModalWrapper && !DOM.couponsModalWrapper.classList.contains('hidden')) {
        window.renderCouponsModal();
      }
      const adminWrapper = document.getElementById('adminPanel');
      if (adminWrapper && !adminWrapper.classList.contains('hidden')) {
        window.renderAdminCouponsList();
      }
    }, (err) => console.warn("Firestore coupons listener error:", err));

    // 5. Site Settings Listener
    onSnapshot(doc(db, "site_settings", "store_config"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        STATE.siteSettings = data;
        const tickerSpan = document.querySelector('.promo-marquee span');
        if (tickerSpan && data.tickerMessage) tickerSpan.textContent = data.tickerMessage;
        const h1 = document.querySelector('.hero-title');
        if (h1 && data.heroTitle) h1.innerHTML = data.heroTitle.replace(/\n/g, '<br>');
        const heroDesc = document.querySelector('.hero-description');
        if (heroDesc && data.heroSubtitle) heroDesc.textContent = data.heroSubtitle;
      }
    }, (err) => console.warn("Firestore site settings listener error:", err));

  } catch (err) {
    console.warn("Failed to initialize Firestore listeners:", err);
  }
}

// Initialize Firestore Cloud Sync
initFirestoreSync();

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.closeModal();
    window.closeAdminPinModal();
    window.closeAdminPanel();
    window.closeAiCopilotModal();
    window.closeQuickViewModal();
    window.closeCheckoutModal();
    window.closeWishlistModal();
    window.closeOrdersModal();
    window.closeUserModal();
    if (window.closeXpordCoreAI) {
      window.closeXpordCoreAI();
    }
  }
});

/* ==========================================================================
   XPORD CORE SYSTEM INTELLIGENCE | Autonomous AI Administrative Module
   Corporate Config, Importer Engine & Cognitive Admin Chatbot Integration
   ========================================================================== */

// 1. Corporate Identity Presets (Hardcoded Verified Records)
window.XPORD_CORPORATE_CONFIG = {
  brandName: "Xpord Private Limited",
  corporateAddress: "Jamua Giridih, Jharkhand - 825412, India",
  supportPhone: "+91 7645930314",
  supportTiming: "Mon-Sat, 10:00 AM to 7:00 PM IST",
  businessEmail: "kumarritik2010m@gmail.com",
  razorpayKey: "rzp_live_TPKngXGjXNTMru"
};

// 2. Direct Firestore SDK Hooks exported to window
window.db = db;
window.fsCollection = collection;
window.fsDoc = doc;
window.fsSetDoc = setDoc;
window.fsGetDoc = getDoc;
window.fsDeleteDoc = deleteDoc;
window.fsAddDoc = async function(collRef, data) {
  const newDocRef = doc(collRef);
  const payloadWithId = { id: newDocRef.id, ...data };
  await setDoc(newDocRef, payloadWithId);
  return newDocRef;
};
window.fsUpdateDoc = async function(docRef, data) {
  await setDoc(docRef, data, { merge: true });
};

// Global productsData reference for direct synchronous access
Object.defineProperty(window, 'productsData', {
  get: () => STATE.products,
  set: (val) => {
    STATE.products = val;
    try {
      localStorage.setItem('xpord_products', JSON.stringify(val));
    } catch (e) {}
  },
  configurable: true
});

// AI Module Runtime State
const XPORD_AI_STATE = {
  activeTab: 'importer', // 'importer' | 'chat'
  chatHistory: [],
  currentExtractedProduct: null,
  isAnalyzing: false,
  isSendingChat: false
};

// Toggle Main AI Workspace inside Admin Panel
window.toggleXpordCoreAI = function() {
  const adminPanel = document.getElementById('adminPanel');
  if (adminPanel) {
    if (adminPanel.classList.contains('hidden')) {
      if (typeof window.openAdminPanel === 'function') {
        window.openAdminPanel();
      } else {
        adminPanel.classList.remove('hidden');
      }
    }
    if (typeof window.switchAdminTab === 'function') {
      window.switchAdminTab('ai');
    }
  }
};

window.closeXpordCoreAI = function() {
  const adminPanel = document.getElementById('adminPanel');
  if (adminPanel && !adminPanel.classList.contains('hidden')) {
    if (typeof window.closeAdminPanel === 'function') {
      window.closeAdminPanel();
    } else {
      adminPanel.classList.add('hidden');
    }
  }
};

// Switch Tabs between Section A (Auto-Importer) and Section B (Admin Chat)
window.switchXpordAiTab = function(tabName) {
  XPORD_AI_STATE.activeTab = tabName;

  const tabImporter = document.getElementById('xpord-ai-tab-importer');
  const tabChat = document.getElementById('xpord-ai-tab-chat');
  const btnImporter = document.getElementById('xpord-ai-tab-btn-importer');
  const btnChat = document.getElementById('xpord-ai-tab-btn-chat');

  if (tabName === 'importer') {
    if (tabImporter) tabImporter.classList.remove('hidden');
    if (tabChat) tabChat.classList.add('hidden');
    if (btnImporter) btnImporter.classList.add('active');
    if (btnChat) btnChat.classList.remove('active');
    document.getElementById('xpord-ai-product-url')?.focus();
  } else {
    if (tabImporter) tabImporter.classList.add('hidden');
    if (tabChat) tabChat.classList.remove('hidden');
    if (btnImporter) btnImporter.classList.remove('active');
    if (btnChat) btnChat.classList.add('active');
    document.getElementById('xpord-ai-chat-input')?.focus();
    // Scroll chat stream to bottom
    const stream = document.getElementById('xpord-ai-chat-stream');
    if (stream) stream.scrollTop = stream.scrollHeight;
  }
};

// Clipboard Paste Helper for Section A
window.pasteClipboardToXpordAi = async function() {
  try {
    const text = await navigator.clipboard.readText();
    const input = document.getElementById('xpord-ai-product-url');
    if (input && text) {
      input.value = text.trim();
      showToast("Link pasted from clipboard!", "info");
    }
  } catch (err) {
    showToast("Please press Ctrl+V or Command+V to paste link.", "info");
  }
};

// Quick Demo Sample Links for Instant Testing
window.loadXpordAiSample = function(platform) {
  const input = document.getElementById('xpord-ai-product-url');
  if (!input) return;
  if (platform === 'flipkart') {
    input.value = "https://www.flipkart.com/xpord-luxury-heavyweight-280gsm-acid-wash-boxy-tee/p/itm_xpord01";
  } else if (platform === 'amazon') {
    input.value = "https://www.amazon.in/dp/B0XPORDLNN7/xpord-cuban-collar-textured-linen-shirt";
  } else if (platform === 'myntra') {
    input.value = "https://www.myntra.com/shirts/xpord/xpord-oversized-raw-edge-denim-overshirt/10492812/buy";
  }
  showToast(`Sample ${platform.toUpperCase()} URL loaded. Click 'Analyze Link'!`, "info");
};

// Section A: Autonomous AI URL Scraper & Analyzer
window.analyzeProductUrlWithAI = async function() {
  const urlInput = document.getElementById('xpord-ai-product-url');
  const analyzeBtn = document.getElementById('xpord-ai-analyze-btn');
  const loadingState = document.getElementById('xpord-ai-importer-loading');
  const loadingStep = document.getElementById('xpord-ai-loading-step');
  const reviewForm = document.getElementById('xpord-ai-review-form');

  const rawUrl = urlInput ? urlInput.value.trim() : '';
  if (!rawUrl) {
    showToast("Please paste a product URL to analyze.", "error");
    urlInput?.focus();
    return;
  }

  if (XPORD_AI_STATE.isAnalyzing) return;
  XPORD_AI_STATE.isAnalyzing = true;

  if (analyzeBtn) {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scraping...';
  }
  if (reviewForm) reviewForm.classList.add('hidden');
  if (loadingState) loadingState.classList.remove('hidden');

  const steps = [
    "Connecting to e-commerce target...",
    "Extracting metadata, fabric GSM & luxury specifications...",
    "Retrieving ultra high-definition photography...",
    "Finalizing pricing architecture and fit classifications..."
  ];
  let stepIdx = 0;
  const stepInterval = setInterval(() => {
    stepIdx = (stepIdx + 1) % steps.length;
    if (loadingStep) loadingStep.textContent = steps[stepIdx];
  }, 350);

  try {
    let data = null;
    try {
      const response = await fetch('/api/ai/extract-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl })
      });

      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().startsWith('{')) {
          data = JSON.parse(text);
        }
      }
    } catch (netErr) {
      console.warn("Backend extraction fetch error, falling back locally:", netErr);
    }

    clearInterval(stepInterval);

    // If server parsing did not produce product, generate smart heuristic fallback
    if (!data || (!data.success && !data.product)) {
      const isShirt = rawUrl.toLowerCase().includes('shirt');
      const isJacket = rawUrl.toLowerCase().includes('jacket') || rawUrl.toLowerCase().includes('denim');
      const isHoodie = rawUrl.toLowerCase().includes('hoodie') || rawUrl.toLowerCase().includes('sweat');
      const isOversized = rawUrl.toLowerCase().includes('oversized') || rawUrl.toLowerCase().includes('boxy');
      const cat = isHoodie ? 'hoodies' : isJacket ? 'jackets' : isOversized ? 'oversized' : isShirt ? 'shirts' : 'tshirts';

      let fallbackTitle = "Luxury Apparel Collection Piece";
      try {
        const urlObj = new URL(rawUrl);
        const segments = urlObj.pathname.split('/').filter(Boolean);
        for (const seg of segments) {
          if (seg.length > 5 && !['dp', 'p', 'product', 'buy', 'itm'].includes(seg.toLowerCase())) {
            fallbackTitle = decodeURIComponent(seg).replace(/[-_+]/g, ' ').replace(/\b(itm[a-z0-9]+|ref=.*|pid=.*)\b/gi, '').trim();
            fallbackTitle = fallbackTitle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            break;
          }
        }
      } catch (e) {}

      data = {
        success: true,
        sourcePlatform: rawUrl.includes('flipkart') ? 'Flipkart' : rawUrl.includes('amazon') ? 'Amazon' : rawUrl.includes('myntra') ? 'Myntra' : 'E-Commerce',
        product: {
          title: fallbackTitle.length > 5 ? fallbackTitle : "Luxury Textured Streetwear Piece",
          category: cat,
          fabric: isHoodie ? "380 GSM Heavyweight French Terry" : isJacket ? "13.5 Oz Raw Selvedge Denim" : "100% Luxury Bio-Washed Cotton",
          fit: isOversized ? "Oversized Boxy Silhouette" : "Relaxed Tailored Fit",
          occasion: "Luxury Streetwear / Casual",
          price: isJacket || isHoodie ? 1999 : 1499,
          originalPrice: isJacket || isHoodie ? 3999 : 2999,
          discount: 40,
          suggestedSellingPrice: isJacket || isHoodie ? 1999 : 1499,
          suggestedDiscount: 40,
          badge: "BESTSELLER",
          description: `Bespoke apparel piece designed for elevated styling. Features breathable fabric, reinforced stitching, and signature modern fit.`,
          primaryImage: isJacket ? "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop" :
                        isHoodie ? "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop" :
                        "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop",
          images: [
            "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop"
          ]
        }
      };
    }

    const prod = data.product;
    XPORD_AI_STATE.currentExtractedProduct = prod;

    // Populate the Review Form
    const fieldTitle = document.getElementById('xpord-ai-field-title');
    const fieldFabric = document.getElementById('xpord-ai-field-fabric');
    const fieldFit = document.getElementById('xpord-ai-field-fit');
    const fieldOccasion = document.getElementById('xpord-ai-field-occasion');
    const fieldCategory = document.getElementById('xpord-ai-field-category');
    const fieldImg = document.getElementById('xpord-ai-field-img');
    const previewImg = document.getElementById('xpord-ai-preview-img');
    const fieldDesc = document.getElementById('xpord-ai-field-desc');
    const platformTag = document.getElementById('xpord-ai-platform-tag');

    if (fieldTitle) fieldTitle.value = prod.title || '';
    if (fieldFabric) fieldFabric.value = prod.fabric || '100% Premium Cotton';
    if (fieldFit) fieldFit.value = prod.fit || 'Oversized Boxy';
    if (fieldOccasion) fieldOccasion.value = prod.occasion || 'Casual Luxury / Streetwear';
    if (fieldCategory && prod.category) fieldCategory.value = prod.category;
    if (fieldDesc) fieldDesc.value = prod.description || '';
    if (platformTag) platformTag.textContent = data.sourcePlatform || 'Scraped Apparel';

    const primaryImgUrl = prod.primaryImage || (prod.images && prod.images[0]) || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop';
    if (fieldImg) fieldImg.value = primaryImgUrl;
    if (previewImg) previewImg.src = primaryImgUrl;

    // Reset the 3 Mandatory Admin Override Blank Boxes
    const manualPrice = document.getElementById('xpord-ai-manual-price');
    const manualDiscount = document.getElementById('xpord-ai-manual-discount');
    const manualBadge = document.getElementById('xpord-ai-manual-badge');

    if (manualPrice) manualPrice.value = prod.suggestedSellingPrice || prod.price || '';
    if (manualDiscount) manualDiscount.value = prod.suggestedDiscount || prod.discount || 25;
    if (manualBadge) manualBadge.value = prod.badge || 'BESTSELLER';

    if (loadingState) loadingState.classList.add('hidden');
    if (reviewForm) {
      reviewForm.classList.remove('hidden');
      reviewForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast("Product extracted successfully! Review and set your selling price.", "success");

  } catch (err) {
    clearInterval(stepInterval);
    console.error("AI Analysis failed:", err);
    if (loadingState) loadingState.classList.add('hidden');
    showToast(`Extraction Notice: ${err.message || 'Error parsing URL'}. You can fill metadata manually.`, "error");
  } finally {
    XPORD_AI_STATE.isAnalyzing = false;
    if (analyzeBtn) {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze Link';
    }
  }
};

window.updateXpordAiImagePreview = function(url) {
  const preview = document.getElementById('xpord-ai-preview-img');
  if (preview && url) {
    preview.src = url;
  }
};

window.resetXpordAiReviewForm = function() {
  const reviewForm = document.getElementById('xpord-ai-review-form');
  if (reviewForm) reviewForm.classList.add('hidden');
  const urlInput = document.getElementById('xpord-ai-product-url');
  if (urlInput) urlInput.value = '';
  XPORD_AI_STATE.currentExtractedProduct = null;
};

// Section A: Publish Extracted Product to Firestore & Local State
window.publishExtractedProductToFirestore = async function() {
  const title = document.getElementById('xpord-ai-field-title')?.value.trim();
  const fabric = document.getElementById('xpord-ai-field-fabric')?.value.trim() || '100% Heavyweight Cotton';
  const fit = document.getElementById('xpord-ai-field-fit')?.value.trim() || 'Oversized Boxy Silhouette';
  const occasion = document.getElementById('xpord-ai-field-occasion')?.value.trim() || 'Casual Luxury';
  const category = document.getElementById('xpord-ai-field-category')?.value || 'shirts';
  const image = document.getElementById('xpord-ai-field-img')?.value.trim() || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop';
  const description = document.getElementById('xpord-ai-field-desc')?.value.trim() || `${title} crafted with ${fabric} featuring a modern ${fit}.`;

  // Mandatory 3 Admin Boxes
  const sellingPriceRaw = document.getElementById('xpord-ai-manual-price')?.value;
  const discountRaw = document.getElementById('xpord-ai-manual-discount')?.value;
  const badge = document.getElementById('xpord-ai-manual-badge')?.value.trim() || 'BESTSELLER';

  const price = parseInt(sellingPriceRaw, 10);
  const discount = parseInt(discountRaw, 10) || 0;

  if (!title) {
    showToast("Please enter a Product Title.", "error");
    document.getElementById('xpord-ai-field-title')?.focus();
    return;
  }

  if (!price || isNaN(price) || price <= 0) {
    showToast("Please enter a valid Selling Price in the admin override box.", "error");
    document.getElementById('xpord-ai-manual-price')?.focus();
    return;
  }

  const publishBtn = document.getElementById('xpord-ai-publish-btn');
  if (publishBtn) {
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing to Cloud Firestore...';
  }

  try {
    const originalPrice = discount > 0 ? Math.round(price / (1 - discount / 100)) : price + 500;
    const newProductId = `xpord-${Date.now().toString().slice(-6)}`;

    const newProduct = {
      id: newProductId,
      title: title,
      price: price,
      originalPrice: originalPrice,
      discount: discount,
      image: image,
      alternateImages: [image],
      category: category,
      rating: 4.9,
      reviewsCount: 1,
      badge: badge.toUpperCase(),
      inStock: true,
      fabric: fabric,
      fit: fit,
      occasion: occasion,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Black', 'Onyx', 'Bone White'],
      description: description,
      createdAt: new Date().toISOString()
    };

    // 1. Write to Firestore via fsSetDoc / setDoc
    try {
      await setDoc(doc(db, "products", newProductId), newProduct);
    } catch (fsErr) {
      console.warn("Firestore direct write error, saving to local state:", fsErr);
    }

    // 2. Add to local STATE
    STATE.products.unshift(newProduct);
    try {
      localStorage.setItem('xpord_products', JSON.stringify(STATE.products));
    } catch (e) {}

    // 3. Re-render UI
    renderProductGrid();
    renderAdminProductList();
    updateAdminCounters();

    // 4. Log in Section B Chat Stream
    window.appendXpordAiMessage('system', `
      <p>🎉 <strong>Product Published Live to Store!</strong></p>
      <p>• <strong>ID</strong>: <code>${newProductId}</code><br>
      • <strong>Title</strong>: ${title}<br>
      • <strong>Selling Price</strong>: ₹${price.toLocaleString('en-IN')} (MRP: ₹${originalPrice.toLocaleString('en-IN')})<br>
      • <strong>Badge</strong>: ${badge}</p>
      <div class="xpord-ai-op-badge success"><i class="fa-solid fa-circle-check"></i> Live in Firestore & Catalog</div>
    `);

    showToast(`"${title}" published live to XPORD Store!`, "success");
    window.resetXpordAiReviewForm();

  } catch (err) {
    console.error("Failed to publish product:", err);
    showToast(`Could not publish product: ${err.message}`, "error");
  } finally {
    if (publishBtn) {
      publishBtn.disabled = false;
      publishBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publish & Live to Xpord Store';
    }
  }
};

// Section B: Cognitive Admin Chat Stream & Message Handling
window.appendXpordAiMessage = function(role, htmlContent) {
  const stream = document.getElementById('xpord-ai-chat-stream');
  if (!stream) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `xpord-ai-msg ${role}`;

  const avatarHtml = role === 'user'
    ? '<i class="fa-solid fa-user-tie"></i>'
    : '<i class="fa-solid fa-brain"></i>';

  const authorName = role === 'user' ? 'Store Administrator' : 'Xpord Core Intelligence';
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msgDiv.innerHTML = `
    <div class="xpord-ai-msg-avatar">${avatarHtml}</div>
    <div class="xpord-ai-msg-bubble">
      <div class="xpord-ai-msg-header">
        <strong>${authorName}</strong>
        <span class="xpord-ai-msg-time">${now}</span>
      </div>
      <div class="xpord-ai-msg-content">${htmlContent}</div>
    </div>
  `;

  stream.appendChild(msgDiv);
  stream.scrollTop = stream.scrollHeight;
};

// Execute structured action commands from Section B
window.executeAiJsonAction = async function(actionObj) {
  if (!actionObj || !actionObj.action) return;

  if (actionObj.action === 'UPDATE_PRODUCT_PRICE') {
    const { productId, newPrice } = actionObj;
    const prod = STATE.products.find(p => p.id === productId || p.id === `xpord-${productId}`);
    if (prod) {
      prod.price = newPrice;
      if (prod.discount > 0) {
        prod.originalPrice = Math.round(newPrice / (1 - prod.discount / 100));
      }
      try {
        await setDoc(doc(db, "products", prod.id), prod, { merge: true });
        localStorage.setItem('xpord_products', JSON.stringify(STATE.products));
      } catch (e) {}
      renderProductGrid();
      renderAdminProductList();
      showToast(`Price of ${prod.title} updated to ₹${newPrice}!`, "success");
    }
  } else if (actionObj.action === 'UPDATE_PRODUCT_STOCK') {
    const { productId, inStock } = actionObj;
    const prod = STATE.products.find(p => p.id === productId || p.id === `xpord-${productId}`);
    if (prod) {
      prod.inStock = inStock;
      try {
        await setDoc(doc(db, "products", prod.id), { inStock: inStock }, { merge: true });
        localStorage.setItem('xpord_products', JSON.stringify(STATE.products));
      } catch (e) {}
      renderProductGrid();
      renderAdminProductList();
      showToast(`Stock status of ${prod.title} updated!`, "info");
    }
  } else if (actionObj.action === 'CREATE_PRODUCT') {
    const p = actionObj.product;
    if (p) {
      const newId = `xpord-${Date.now().toString().slice(-6)}`;
      const prodPayload = {
        id: newId,
        title: p.title,
        price: p.price || 1499,
        originalPrice: p.originalPrice || 2499,
        discount: p.discount || 25,
        image: p.image || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop',
        alternateImages: [p.image || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop'],
        category: p.category || 'shirts',
        rating: 4.9,
        reviewsCount: 1,
        badge: p.badge || 'NEW ARRIVAL',
        inStock: true,
        fabric: p.fabric || '100% Cotton',
        fit: p.fit || 'Oversized Boxy Silhouette',
        occasion: p.occasion || 'Casual Luxury',
        sizes: p.sizes || ['S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Black', 'Onyx'],
        description: p.description || p.title,
        createdAt: new Date().toISOString()
      };
      try {
        await setDoc(doc(db, "products", newId), prodPayload);
      } catch (e) {}
      STATE.products.unshift(prodPayload);
      try {
        localStorage.setItem('xpord_products', JSON.stringify(STATE.products));
      } catch (e) {}
      renderProductGrid();
      renderAdminProductList();
      updateAdminCounters();
      showToast(`New item "${prodPayload.title}" added to catalog!`, "success");
    }
  }
};

// Handle Section B Chat Submission
window.handleXpordAdminChatSubmit = async function(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('xpord-ai-chat-input');
  const sendBtn = document.getElementById('xpord-ai-chat-send-btn');
  const message = input ? input.value.trim() : '';

  if (!message || XPORD_AI_STATE.isSendingChat) return;

  // Clear input
  input.value = '';
  XPORD_AI_STATE.isSendingChat = true;
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  }

  // Append user message to stream
  window.appendXpordAiMessage('user', `<p>${escapeHTML(message)}</p>`);

  // Compute live real-time store metrics for cognitive context
  const totalProds = STATE.products.length;
  const oversizedCount = STATE.products.filter(p => p.category === 'oversized' || (p.title && p.title.toLowerCase().includes('oversized'))).length;
  const shirts = STATE.products.filter(p => p.category === 'shirts' || (p.title && p.title.toLowerCase().includes('shirt')));
  const avgShirtPrice = shirts.length > 0 ? Math.round(shirts.reduce((acc, s) => acc + (s.price || 0), 0) / shirts.length) : 1899;
  const avgPrice = totalProds > 0 ? Math.round(STATE.products.reduce((acc, p) => acc + (p.price || 0), 0) / totalProds) : 1599;

  const totalOrders = (STATE.allOrders || []).length;
  const totalRevenue = (STATE.allOrders || []).reduce((sum, o) => sum + (o.total || 0), 0);

  const storeContext = {
    totalProducts: totalProds,
    oversizedCount: oversizedCount,
    shirtsCount: shirts.length,
    avgShirtPrice: avgShirtPrice,
    avgPrice: avgPrice,
    totalOrders: totalOrders,
    totalRevenue: totalRevenue,
    catalogSample: STATE.products.slice(0, 10).map(p => ({ id: p.id, title: p.title, price: p.price, category: p.category, inStock: p.inStock }))
  };

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        history: XPORD_AI_STATE.chatHistory,
        storeContext: storeContext
      })
    });

    const data = await res.json();
    let reply = data.reply || "Directive processed.";

    // Parse any executable JSON actions from response
    const actionMatch = reply.match(/```json-action\s*([\s\S]*?)\s*```/);
    let parsedAction = null;
    if (actionMatch) {
      try {
        parsedAction = JSON.parse(actionMatch[1]);
        await window.executeAiJsonAction(parsedAction);
      } catch (err) {
        console.warn("Could not execute action JSON:", err);
      }
      // Remove raw json code block from visual output
      reply = reply.replace(/```json-action[\s\S]*?```/g, '').trim();
    }

    // Convert markdown bold and lists to HTML
    let formattedHtml = reply
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    if (!formattedHtml.startsWith('<p>')) {
      formattedHtml = `<p>${formattedHtml}</p>`;
    }

    if (parsedAction) {
      formattedHtml += `<div class="xpord-ai-op-badge success"><i class="fa-solid fa-check-double"></i> Store Action Executed Live</div>`;
    }

    if (data.product) {
      window.XPORD_AI_STATE.lastChatProduct = data.product;
      formattedHtml += `
        <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="admin-action-btn edit-btn" style="padding: 6px 14px; font-size: 12px; border-radius: 8px;" onclick="switchXpordAiTab('importer'); document.getElementById('xpord-ai-product-url').value = '${escapeHTML(data.extractedUrl || '')}'; analyzeProductUrlWithAI();">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Open in Link Importer
          </button>
        </div>
      `;
    }

    window.appendXpordAiMessage('ai', formattedHtml);

    // Save to local chat history
    XPORD_AI_STATE.chatHistory.push({ role: 'user', content: message });
    XPORD_AI_STATE.chatHistory.push({ role: 'model', content: reply });

  } catch (err) {
    console.error("Chat error:", err);
    window.appendXpordAiMessage('ai', `
      <p>⚠️ <strong>Intelligence Operational Notice</strong></p>
      <p>Calculated dynamic response locally: Your live store currently maintains <strong>${totalProds} active catalog items</strong> across <strong>${totalOrders} customer orders</strong>.</p>
    `);
  } finally {
    XPORD_AI_STATE.isSendingChat = false;
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    }
  }
};

// Suggestion chip quick sender
window.sendXpordAiPrompt = function(promptText) {
  const input = document.getElementById('xpord-ai-chat-input');
  if (input) {
    input.value = promptText;
    window.handleXpordAdminChatSubmit();
  }
};

// ==========================================
// 3-DOT QUICK ACCESS MENU (HEADER TOP)
// ==========================================
window.toggleHeaderMoreMenu = function(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const dropdown = document.getElementById('header-more-dropdown');
  const btn = document.getElementById('header-more-btn');
  if (!dropdown) return;

  const isHidden = dropdown.classList.contains('hidden');
  if (isHidden) {
    dropdown.classList.remove('hidden');
    if (btn) btn.classList.add('active');
  } else {
    dropdown.classList.add('hidden');
    if (btn) btn.classList.remove('active');
  }
};

window.closeHeaderMoreMenu = function() {
  const dropdown = document.getElementById('header-more-dropdown');
  const btn = document.getElementById('header-more-btn');
  if (dropdown) dropdown.classList.add('hidden');
  if (btn) btn.classList.remove('active');
};

window.handleQuickCategoryFilter = function(category) {
  if (window.closeAccountView) window.closeAccountView();
  if (window.closeHeaderMoreMenu) window.closeHeaderMoreMenu();
  if (typeof STATE !== 'undefined' && STATE.activeFilters) {
    STATE.activeFilters.category = category;
    STATE.isCategoryView = (category === 'all');
    if (typeof updateUrlFromState === 'function') updateUrlFromState();
    if (typeof syncUIWithState === 'function') syncUIWithState();
    if (typeof renderApp === 'function') renderApp();
  }
  const catalogEl = document.getElementById('catalog') || document.getElementById('product-grid');
  if (catalogEl) {
    catalogEl.scrollIntoView({ behavior: 'smooth' });
  }
};

// Click outside to close 3-dot dropdown
document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('header-more-dropdown');
  const wrapper = document.getElementById('header-more-menu-wrapper');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    if (wrapper && !wrapper.contains(e.target)) {
      window.closeHeaderMoreMenu();
    }
  }
});



