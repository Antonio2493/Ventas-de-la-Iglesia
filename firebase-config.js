// Credenciales de tu proyecto de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAyzQ3pvXWmiTNHpI8BanWfECIZBlgQRYs",
    authDomain: "base-de-datos-de-canciones.firebaseapp.com",
    projectId: "base-de-datos-de-canciones",
    storageBucket: "base-de-datos-de-canciones.firebasestorage.app",
    messagingSenderId: "389166639712",
    appId: "1:389166639712:web:6add84770f5892a80af105",
    measurementId: "G-HHHMW6VZ8Z"
};

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Exportar las funciones de Firestore globalmente para app.js
window.db = firebase.firestore();
window.collection = firebase.firestore.collection;
window.doc = firebase.firestore.doc;
window.addDoc = (colRef, data) => colRef.add(data);
window.setDoc = (docRef, data, options) => docRef.set(data, options);
window.deleteDoc = (docRef) => docRef.delete();
window.onSnapshot = (ref, callback) => ref.onSnapshot(callback);

// Disparar evento para avisar que Firebase está listo
window.dispatchEvent(new Event('firebase-ready'));