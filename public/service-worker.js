/* Alturath Admin — retired app-shell worker.
   From Sep 5 to Oct 1 this file was an offline app-shell worker on scope "/", the
   same scope as firebase-messaging-sw.js. A scope holds one worker, so it replaced
   the push worker and notifications stopped until the app was reinstalled. The app
   no longer registers it. A device still running it picks up this version on its
   next update check and becomes the push worker, so notifications keep showing
   whichever of the two files that device holds. */
importScripts("/firebase-messaging-sw.js");
