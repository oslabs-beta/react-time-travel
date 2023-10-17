/* eslint-disable max-len */
import React, { useEffect, useState } from 'react';
import ActionContainer from './ActionContainer';
import TravelContainer from './TravelContainer';
import ButtonsContainer from './ButtonsContainer';
import ErrorContainer from './ErrorContainer';
import StateContainer from './StateContainer';
import {
  addNewSnapshots,
  initialConnect,
  setPort,
  setTab,
  deleteTab,
  noDev,
  setCurrentLocation,
  disconnected,
  endConnect,
} from '../RTKslices';
import { useDispatch, useSelector } from 'react-redux';

/*
  This is the main container where everything in our application is rendered
*/

function MainContainer(): JSX.Element {
  const dispatch = useDispatch();

  const currentTab = useSelector((state: any) => state.main.currentTab);
  const tabs = useSelector((state: any) => state.main.tabs);
  const port = useSelector((state: any) => state.main.port);
  const { connectRequested } = useSelector((state: any) => state.main);
  
  const [actionView, setActionView] = useState(true); // We create a local state 'actionView' and set it to true

  // this function handles Time Jump sidebar view
  const toggleActionContainer = () => {
    setActionView(!actionView); // sets actionView to the opposite boolean value

    const toggleElem = document.querySelector('aside'); // aside is like an added text that appears "on the side" aside some text.
    toggleElem.classList.toggle('no-aside'); // toggles the addition or the removal of the 'no-aside' class

    const recordBtn = document.getElementById('recordBtn');

    if (recordBtn.style.display === 'none') { // switches whether to display the record toggle button by changing the display property between none and flex
      recordBtn.style.display = 'flex';
    } else {
      recordBtn.style.display = 'none';
    }
  };




  const handleDisconnect = (msg): void => {
    if (msg === 'portDisconnect') {
      console.log('unexpected port disconnection');
      dispatch(disconnected());
    }
  }

  const handleConnect = () => {
    const maxRetries = 10;
    const retryInterval = 1000;
    const maxTimeout = 15000;

    return new Promise((resolve) => {
      let port: chrome.runtime.Port;
      console.log('init port: ', port)

      const attemptReconnection = (retries: number, startTime: number) => {
        // console.log('WORKING')
        if (retries <= maxRetries && Date.now() - startTime < maxTimeout) {
          if (retries === 1)
            port = chrome.runtime.connect();
          // console.log('HITTING IF');
          chrome.runtime.sendMessage({ action: 'attemptReconnect' }, (response) => {
            if (response && response.success) {
              console.log('Reconnect Success: ', response.success);
              resolve(port);
            } else {
              console.log('Reconnect failed: ', !response && response.success);
    
              setTimeout(() => {
                console.log('trying!', retries)
                attemptReconnection(retries + 1, startTime);
              }, retryInterval);
            }
          });
        } else {
          console.log('PORT CONNECT FAILED');
          resolve(null);
        }
      };
      attemptReconnection(1, Date.now());
    });
  }

  const messageListener = (message: { 
    action: string; 
    payload: Record<string, unknown>; 
    sourceTab: number 
  }) => {
    const { action, payload, sourceTab } = message;
    let maxTab: number;

    if (!sourceTab && action !== 'keepAlive') { // if the sourceTab doesn't exist or is 0 and it is not a 'keepAlive' action
      const tabsArray: Array<string> = Object.keys(payload); // we create a tabsArray of strings composed of keys from our payload object
      const numTabsArray: number[] = tabsArray.map((tab) => Number(tab)); // we then map out our tabsArray where we convert each string into a number
    
      maxTab = Math.max(...numTabsArray); // we then get the largest tab number value
    }

    switch (action) {
      case 'deleteTab': {
        dispatch(deleteTab(payload));
        break;
      }
      case 'devTools': {
        dispatch(noDev(payload));
        break;
      }
      case 'changeTab': {
        console.log('received changeTab message')
        dispatch(setTab(payload));
        break;
      }
      case 'sendSnapshots': {
        dispatch(setTab(sourceTab));
        // set state with the information received from the background script
        dispatch(addNewSnapshots(payload));
        break;
      }
      case 'initialConnectSnapshots': {
        dispatch(initialConnect(payload));
        break;
      }
      case 'setCurrentLocation': {
        dispatch(setCurrentLocation(payload));
        break;
      }
      default:
    }
  }

  useEffect(() => {
    if (port) return; // only open port once so if it exists, do not run useEffect again
        
    const currentPort = chrome.runtime.connect();
    
    while (chrome.runtime.onMessage.hasListener(messageListener))
      chrome.runtime.onMessage.removeListener(messageListener);
    
    // listen for a message containing snapshots from the /extension/build/background.js service worker
    currentPort.onMessage.addListener(messageListener);
    
    while (chrome.runtime.onMessage.hasListener(handleDisconnect))
      chrome.runtime.onMessage.removeListener(handleDisconnect);
    
    // used to track when the above connection closes unexpectedly. Remember that it should persist throughout the application lifecycle
    chrome.runtime.onMessage.addListener(handleDisconnect);
    
    // assign port to state so it could be used by other components
    dispatch(setPort(currentPort));

    dispatch(endConnect());
  });

  // Error Page launch IF(Content script not launched OR RDT not installed OR Target not React app)
  if (
    !tabs[currentTab] ||
    !tabs[currentTab].status.reactDevToolsInstalled ||
    !tabs[currentTab].status.targetPageisaReactApp
  ) {
    return <ErrorContainer />;
  }

  const { currLocation, viewIndex, sliderIndex, snapshots, hierarchy, webMetrics } = tabs[currentTab]; // we destructure the currentTab object
  const snapshotView = viewIndex === -1 ? snapshots[sliderIndex] : snapshots[viewIndex]; // if viewIndex is -1, then use the sliderIndex instead

  // cleaning hierarchy and snapshotView from stateless data
  const statelessCleaning = (obj: {
    name?: string;
    componentData?: object;
    state?: string | any;
    stateSnapshot?: object;
    children?: any[];
  }) => {
    const newObj = { ...obj };
    if (newObj.name === 'nameless') {
      delete newObj.name;
    }
    if (newObj.componentData) {
      delete newObj.componentData;
    }
    if (newObj.state === 'stateless') {
      delete newObj.state;
    }
    if (newObj.stateSnapshot) {
      newObj.stateSnapshot = statelessCleaning(obj.stateSnapshot);
    }
    if (newObj.children) {
      newObj.children = [];
      if (obj.children.length > 0) {
        obj.children.forEach((element: { state?: object | string; children?: [] }) => {
          if (element.state !== 'stateless' || element.children.length > 0) {
            const clean = statelessCleaning(element);
            newObj.children.push(clean);
          }
        });
      }
    }
    return newObj;
  };
  const snapshotDisplay = statelessCleaning(snapshotView);
  const hierarchyDisplay = statelessCleaning(hierarchy);

  return (
    <div className='main-container'>
      <div id='bodyContainer' className='body-container'>
        <ActionContainer
          actionView={actionView}
          setActionView={setActionView}
          toggleActionContainer={toggleActionContainer}
        />
        {snapshots.length ? (
          <div className='state-container-container'>
            <StateContainer
              webMetrics={webMetrics}
              viewIndex={viewIndex}
              snapshot={snapshotDisplay}
              hierarchy={hierarchyDisplay}
              snapshots={snapshots}
              currLocation={currLocation}
            />
          </div>
        ) : null}
        <TravelContainer snapshotsLength={snapshots.length} />
        <ButtonsContainer />
      </div>
    </div>
  );
}

export default MainContainer;
