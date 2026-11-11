// CS Interactive Workshop - Firebase web configuration.
//
// Accounts are optional: while this is null the workshop works fully in guest mode
// and progress is saved only on the student's device.
//
// To turn on "Continuar con Google":
//   1. Firebase console > project "cs-interactive-workshop" > Project settings >
//      General > Your apps > Add app > Web. Copy the firebaseConfig object here.
//   2. Authentication > Sign-in method > enable Google.
//   3. Firestore Database > Create database, then deploy the rules in
//      /firestore.rules with:  firebase deploy --only firestore:rules
//   4. Authentication > Settings > Authorized domains: localhost and your
//      *.web.app domain are allowed by default; add any custom domain.
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
