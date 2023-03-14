/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
/* eslint-disable indent */
/* eslint-disable brace-style */
/* eslint-disable comma-dangle */
/* eslint-disable no-underscore-dangle */
/* eslint-disable func-names */
/* eslint-disable no-use-before-define */
/* eslint-disable no-param-reassign */
/* eslint-disable-next-line no-mixed-operators */

// import typescript types
import {
  // tree
  Snapshot,
  // jump, pause
  Status,
  // object with tree structure
  FiberRoot,
} from '../types/backendTypes';
import { DevTools } from '../types/linkFiberTypes';
import updateSnapShotTree from './snapShot';

// throttle returns a function that can be called any number of times (possibly in quick succession) but will only invoke the callback at most once every x ms
// getHooksNames - helper function to grab the getters/setters from `elementType`
import throttle from '../controllers/throttle';
import componentActionsRecord from '../models/masterState';
import createComponentActionsRecord from '../controllers/createTree/createComponentActionsRecord';
import timeJump from '../controllers/timeJump';

// Set global variables to use in exported module and helper functions
declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: DevTools;
    __REDUX_DEVTOOLS_EXTENSION__?: any;
  }
}

/**
 * linkFiber contains core module functionality, exported as an anonymous function, perform the following logic:
 * 1. Check if React Dev Tool is installed.
 * 2. Check if the target application (on the browser) is a valid react application.
 * 3. Initiate a event listener for visibility update of the target React Applicaiton.
 * 4. Obtain the initial fiberRootNode, which is the root node of a tree of React component.
 * 5. Initialize the tree snapShot on Chrome Extension.
 * 6. Monkey patching the onCommitFiberRoot from REACT DEV TOOL to obtain updated data after React Applicaiton is re-rendered.
 * @param snapShot The current snapshot
 * @param mode The current mode (i.e. jumping, time-traveling, or paused)
 * @return a function to be invoked by index.js that initiates snapshot monitoring
 */
export default function linkFiber(snapShot: Snapshot, mode: Status): () => void {
  /**
   * A boolean value indicate if the target React Application is visible
   */
  let isVisible: boolean = true;
  /**
   * The `fiberRootNode`, which is the root node of a tree of React component.
   * The `current` property of `fiberRoot` has data structure of a Tree, which can be used to traverse and obtain all child component data.
   */
  let fiberRoot: FiberRoot;
  /**
   * @constant MIN_TIME_BETWEEN_UPDATE - The minimum time (ms) between each re-render/update of the snapShot tree being displayed on the Chrome Extension.
   */
  const MIN_TIME_BETWEEN_UPDATE = 10;
  /**
   * @function throttledUpdateSnapshot - a function that will wait for at least MIN_TIME_BETWEEN_UPDATE ms, before updating the tree snapShot being displayed on the Chrome Extension.
   */
  const throttledUpdateSnapshot = throttle((fiberRoot) => {
    console.log('RERENDER');
    // If jumping cause a navigation to a new route:
    if (mode.navigating) {
      console.log('OBTAIN NEW UPDATE METHOD');
      // Reset the array containing update methods:
      componentActionsRecord.clear();
      // Obtain new update methods for the current route:
      const { current } = fiberRoot;
      createComponentActionsRecord(current);
      // Invoke timeJump to update reactFiber based on the snapshotTree & the newly obtained BOUND update methods
      mode.navigating();
    }
    // Else if not jumping
    else if (!mode.jumping) {
      // Update and Send SnapShot tree to front end
      updateSnapShotTree(snapShot, mode, fiberRoot);
    }
  }, MIN_TIME_BETWEEN_UPDATE);

  // Return a function to be invoked by index.js that initiates snapshot monitoring
  // TODO: Convert this into async/await & add try/catch

  return () => {
    // -------------------CHECK REACT DEVTOOL INSTALLATION----------------------
    // react devtools global hook is a global object that was injected by the React Devtools content script, allows access to fiber nodes and react version
    // Obtain React Devtools Object:
    const devTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    // If React Devtools is not installed, object will be undefined.
    if (!devTools) {
      return;
    }
    // If React Devtools is installed, send a message to front end.
    window.postMessage(
      {
        action: 'devToolsInstalled',
        payload: 'devToolsInstalled',
      },
      '*',
    );

    // --------------------CHECK VALID REACT APPLICATION------------------------
    // Obtain React Application information:
    const reactInstance = devTools.renderers.get(1);
    // If target application is not a React App, this will return undefined.
    if (!reactInstance) {
      return;
    }
    // If target application is a React App, send a message to front end.
    window.postMessage(
      {
        action: 'aReactApp',
        payload: 'aReactApp',
      },
      '*',
    );
    // --------------INITIATE EVENT LISTENER FOR VISIBILITY CHANGE--------------
    /**
     * Initiate an event listener for when there is a change to the visibility of the react target application (the browser tab)
     * @example If tic-tac-toe demo app is loaded on a tab with localhost:8080, whenever user switch tab or switch to another software => 'visibilityChange' => invoke the callback to update doWork boolean value
     */
    document.addEventListener('visibilitychange', () => {
      // Hidden property = background tab/minimized window
      isVisible = !document.hidden;
    });

    // ---------OBTAIN THE INITIAL FIBEROOTNODE FROM REACT DEV TOOL-------------
    // Obtain the FiberRootNode, which is the first value in the FiberRoot Set:
    fiberRoot = devTools.getFiberRoots(1).values().next().value;
    console.log('linkFiber', { fiberRoot });
    // DO NOT REMOVE: due to the nature of Next JS, when the website get reloaded, fiberRoot will not be
    // console.log(devTools.getFiberRoots(1));
    // while (!fiberRoot) {
    //   fiberRoot = devTools.getFiberRoots(1).values().next().value;
    // }
    // ----------INITIALIZE THE TREE SNAP SHOT ON CHROME EXTENSION--------------
    throttledUpdateSnapshot(fiberRoot); // only runs on start up

    // --------MONKEY PATCHING THE onCommitFiberRoot FROM REACT DEV TOOL--------
    // React has inherent methods that are called with react fiber
    // One of which is the onCommitFiberRoot method, which is invoked after the React application re-render its component(s).
    // we attach new functionality without compromising the original work that onCommitFiberRoot does
    /**
     * @param onCommitFiberRoot -  is a callback provided by React that is automatically invoked by React Fiber after the target React application re-renders its components. This callback is used by REACT DEV TOOL to receive updated data about the component tree and its state. See {@link https://medium.com/@aquinojardim/react-fiber-reactime-4-0-f200f02e7fa8}
     * @returns an anonymous function, which will have the same parameters as onCommitFiberRoot and when invoked will update the fiberRoot value & post a request to update the snapShot tree on Chrome Extension
     */
    function addOneMoreStep(onCommitFiberRoot: DevTools['onCommitFiberRoot']) {
      return function (...args: Parameters<typeof onCommitFiberRoot>) {
        // eslint-disable-next-line prefer-destructuring
        // Obtain the updated FiberRootNode, after the target React application re-renders
        fiberRoot = args[1];
        // If the target React application is visible, send a request to update the snapShot tree displayed on Chrome Extension
        if (isVisible) throttledUpdateSnapshot(fiberRoot);
        // After our added work is completed we invoke the original onComitFiberRoot function
        return onCommitFiberRoot(...args);
      };
    }
    // Money Patching the onCommitFiberRoot method from REACT DEV TOOL
    devTools.onCommitFiberRoot = addOneMoreStep(devTools.onCommitFiberRoot);
  };
}
