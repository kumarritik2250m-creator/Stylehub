/* ==========================================================================
   XPORD CLOTHING | Login & Registration Dedicated Controller
   ========================================================================== */
import { 
  db, 
  auth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from "./src/firebase.js";
import { doc, setDoc, getDoc } from "firebase/firestore";

let currentAuthTab = 'login';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

// Toast helper
function showToast(message, type = 'info') {
  const container = document.getElementById('login-toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'info-circle';
  if (type === 'success') icon = 'circle-check';
  if (type === 'error') icon = 'circle-exclamation';
  if (type === 'warning') icon = 'triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
window.showToast = showToast;

// Sync User session and merge cart
async function syncAndRedirectUser(userObj) {
  const now = Date.now();
  userObj.loginTimestamp = userObj.loginTimestamp || now;
  userObj.sessionExpiresAt = userObj.sessionExpiresAt || (now + SESSION_DURATION_MS);
  userObj.lastActiveAt = now;

  try {
    localStorage.setItem('xpord_user', JSON.stringify(userObj));
  } catch(e) {
    console.warn("User save warning:", e);
  }

  const uid = userObj.uid || (userObj.email ? userObj.email.replace(/[^a-zA-Z0-9]/g, '_') : 'guest');
  const userDocId = userObj.email ? userObj.email.replace(/[^a-zA-Z0-9]/g, '_') : uid;

  // Restore & merge local cart with user cloud cart
  let userCart = [];
  try {
    const saved = localStorage.getItem(`xpord_cart_${uid}`);
    if (saved) userCart = JSON.parse(saved);
  } catch(e) {}

  let guestCart = [];
  try {
    const savedGuest = localStorage.getItem('xpord_cart');
    if (savedGuest) guestCart = JSON.parse(savedGuest);
  } catch(e) {}

  // Fetch Firestore cart if available
  try {
    const snap = await getDoc(doc(db, "users", userDocId));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.cart) && data.cart.length > 0 && userCart.length === 0) {
        userCart = data.cart;
      }
    }
  } catch(e) {
    console.warn("Cloud cart sync:", e);
  }

  // Merge guest cart items
  const mergedCart = [...userCart];
  if (Array.isArray(guestCart) && guestCart.length > 0) {
    guestCart.forEach(curItem => {
      const existing = mergedCart.find(m => m.product && curItem.product && m.product.id === curItem.product.id && m.size === curItem.size);
      if (existing) {
        existing.quantity = Math.max(existing.quantity, curItem.quantity);
      } else {
        mergedCart.push(curItem);
      }
    });
  }

  try {
    localStorage.setItem('xpord_cart', JSON.stringify(mergedCart));
    localStorage.setItem(`xpord_cart_${uid}`, JSON.stringify(mergedCart));
  } catch(e) {}

  // Determine redirect URL and execute instant redirect
  const rawIntent = sessionStorage.getItem('checkout_flow_intent');
  const isPendingCheckout = localStorage.getItem('xpord_pending_checkout') === 'true';
  const urlParams = new URLSearchParams(window.location.search);
  const redirectParam = urlParams.get('redirect');

  if (rawIntent) {
    window.location.href = "index.html";
  } else if (isPendingCheckout || redirectParam === 'checkout') {
    window.location.href = "index.html#checkout";
  } else if (redirectParam) {
    window.location.href = redirectParam;
  } else {
    window.location.href = "index.html";
  }
}

// Google Sign-In
window.handleGoogleSignIn = async function() {
  const btn = document.getElementById('google-signin-btn');
  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting to Google...';
    }
    showToast("Connecting to Google Sign-In...", "info");

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);

    const user = result.user;
    const name = user.displayName || (user.email ? user.email.split('@')[0] : 'Member');
    const email = user.email || '';
    const phone = user.phoneNumber || '';

    const userObj = {
      uid: user.uid,
      name: name,
      email: email,
      phone: phone,
      photoURL: user.photoURL || '',
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "users", user.uid), userObj, { merge: true });
    } catch (err) {
      console.warn("Firestore user sync:", err);
    }

    showToast(`Welcome, ${name}! Redirecting...`, "success");
    await syncAndRedirectUser(userObj);
  } catch (error) {
    const errCode = error?.code || '';
    if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
      console.info("Google Sign-In popup closed by user.");
      showToast("Google Sign-In was closed.", "info");
    } else if (errCode === 'auth/popup-blocked') {
      console.warn("Google Sign-In popup blocked:", error);
      showToast("Please allow popups for this site to sign in with Google.", "error");
    } else {
      console.error("Google Auth error:", error);
      showToast(error.message || "Google Sign-In failed.", "error");
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
        Continue with Google
      `;
    }
  }
};

// Switch Tab
window.switchTab = function(tab) {
  currentAuthTab = tab;
  const loginTabBtn = document.getElementById('tab-btn-login');
  const registerTabBtn = document.getElementById('tab-btn-register');
  const nameField = document.getElementById('field-name');
  const phoneField = document.getElementById('field-phone');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleText = document.getElementById('auth-toggle-prompt');

  if (tab === 'login') {
    if (loginTabBtn) loginTabBtn.classList.add('active');
    if (registerTabBtn) registerTabBtn.classList.remove('active');
    if (nameField) nameField.style.display = 'none';
    if (phoneField) phoneField.style.display = 'none';
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login to Account';
    if (toggleText) toggleText.innerHTML = `Don't have an account yet? <a href="#" onclick="switchTab('register'); return false;" style="font-weight:700; color:var(--text-primary); text-decoration:underline;">Register / Sign Up</a>`;
  } else {
    if (registerTabBtn) registerTabBtn.classList.add('active');
    if (loginTabBtn) loginTabBtn.classList.remove('active');
    if (nameField) nameField.style.display = 'block';
    if (phoneField) phoneField.style.display = 'block';
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account & Proceed';
    if (toggleText) toggleText.innerHTML = `Already registered? <a href="#" onclick="switchTab('login'); return false;" style="font-weight:700; color:var(--text-primary); text-decoration:underline;">Login Here</a>`;
  }
};

// Password visibility toggle
window.togglePasswordVisibility = function() {
  const pwd = document.getElementById('auth-password');
  const icon = document.getElementById('pwd-toggle-icon');
  if (!pwd) return;
  if (pwd.type === 'password') {
    pwd.type = 'text';
    if (icon) icon.className = 'fa-solid fa-eye-slash';
  } else {
    pwd.type = 'password';
    if (icon) icon.className = 'fa-solid fa-eye';
  }
};

// Form Submission
window.handleFormSubmit = async function(event) {
  event.preventDefault();
  const isLogin = currentAuthTab === 'login';
  const name = document.getElementById('auth-name')?.value.trim();
  const email = document.getElementById('auth-email')?.value.trim().toLowerCase();
  const password = document.getElementById('auth-password')?.value;
  const phone = document.getElementById('auth-phone')?.value.trim() || '';

  if (!email || !password) {
    showToast("Please enter email and password.", "error");
    return;
  }

  if (!isLogin && (!name || name.length < 2)) {
    showToast("Please enter your full name for registration.", "error");
    return;
  }

  if (!isLogin && password.length < 6) {
    showToast("Password must be at least 6 characters long.", "error");
    return;
  }

  const submitBtn = document.getElementById('auth-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
  }

  const userDocId = email.replace(/[^a-zA-Z0-9]/g, '_');

  try {
    let displayName = name;
    let userUid = userDocId;

    if (isLogin) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        displayName = user.displayName || name || email.split('@')[0];
        userUid = user.uid;
      } catch (authErr) {
        console.warn("Firebase Auth login check fallback:", authErr);
        // Fallback check in Firestore DB
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
            showToast("No account found with this email. Please register.", "info");
            switchTab('register');
            return;
          }
          throw authErr;
        }
      }
    } else {
      // Register
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        userUid = user.uid;
        displayName = name;
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          showToast("Email already registered. Please login.", "info");
          switchTab('login');
          return;
        }
        displayName = name;
      }
    }

    const userObj = {
      uid: userUid,
      name: displayName || name || email.split('@')[0],
      email: email,
      phone: phone,
      password: password,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "users", userDocId), userObj, { merge: true });
    } catch(e) {
      console.warn("User Firestore save:", e);
    }

    showToast(isLogin ? `Welcome back, ${displayName}!` : `Account created! Welcome, ${displayName}.`, "success");
    await syncAndRedirectUser(userObj);

  } catch (err) {
    console.error("Auth error:", err);
    let msg = err.message || "Authentication failed.";
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = "Incorrect email or password. Please verify your credentials.";
    } else if (err.code === 'auth/email-already-in-use') {
      msg = "This email is already in use. Please login instead.";
      switchTab('login');
    }
    showToast(msg, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = isLogin 
        ? '<i class="fa-solid fa-right-to-bracket"></i> Login to Account' 
        : '<i class="fa-solid fa-user-plus"></i> Create Account & Proceed';
    }
  }
};

// Check if user already logged in or if checkout banner should be displayed
document.addEventListener('DOMContentLoaded', () => {
  const isPendingCheckout = localStorage.getItem('xpord_pending_checkout') === 'true';
  const rawIntent = sessionStorage.getItem('checkout_flow_intent');
  const banner = document.getElementById('checkout-intent-banner');
  if (banner && (isPendingCheckout || rawIntent)) {
    banner.style.display = 'flex';
  }

  // If already logged in, redirect directly to index.html
  try {
    const rawUser = localStorage.getItem('xpord_user');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user && user.email) {
        window.location.href = "index.html";
      }
    }
  } catch(e) {}
});
