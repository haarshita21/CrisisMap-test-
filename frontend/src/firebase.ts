import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "dummy-key",
  authDomain: "crisismapai-1aced.firebaseapp.com",
  databaseURL: "https://crisismapai-1aced-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "crisismapai-1aced",
  storageBucket: "crisismapai-1aced.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:test"
};

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

export const db = getDatabase(app);