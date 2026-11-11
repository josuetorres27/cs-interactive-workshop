// CS Interactive Workshop - Firebase web configuration.
//
// Accounts are optional: set FIREBASE_CONFIG to null to run in guest mode only,
// where progress is saved just on the student's device.
//
// Setup (already done for this project):
//   1. Firebase console > Project settings > General > Your apps > Web app.
//   2. Authentication > Sign-in method > Google enabled.
//   3. Firestore Database created; publish the rules in /firestore.rules.
//   4. Authentication > Settings > Authorized domains: localhost and the
//      *.web.app and *.firebaseapp.com domains are allowed by default; add
//      any custom domain.
//
// These values are not secrets (every web app ships them to the browser);
// what protects student data are the Firestore rules.
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB9NioXlQzD1bVje5dGj_Z8yXp2ZNN7wwk',
  authDomain: 'cs-interactive-workshop.firebaseapp.com',
  projectId: 'cs-interactive-workshop',
  storageBucket: 'cs-interactive-workshop.firebasestorage.app',
  messagingSenderId: '104803519250',
  appId: '1:104803519250:web:d4196e06169a44260b81cb'
};
