import * as React from "react";
import firebase from "firebase/app";
import "firebase/performance";

const firebaseConfig = {
  apiKey: "AIzaSyBlEYHLq02ZfZsXQ5I0MXq2nf3QCXWM_14",
  authDomain: "geo-web-cadastre.firebaseapp.com",
  projectId: "geo-web-cadastre",
  storageBucket: "geo-web-cadastre.appspot.com",
  messagingSenderId: "890300523540",
  appId: "1:890300523540:web:271b68c3f5d1ea87dd7301",
};

export function useFirebase() {
  const [firebasePerf, setFirebasePerf] = React.useState(null);

  React.useEffect(() => {
    try {
      firebase.app();
    } catch (err) {
      firebase.initializeApp(firebaseConfig);
    }

    const perf = firebase.performance();

    setFirebasePerf(perf);
  }, [firebaseConfig]);

  return { firebasePerf: firebasePerf };
}
