import * as React from 'react';
//importing useState from react to handle local state for button reconnect functionality
import { useState } from 'react';
import { Button } from '@mui/material';
//importing necesary material UI components for dialogue popup
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Tutorial from '../components/Tutorial';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { toggleMode, importSnapshots, startReconnect } from '../RTKslices';
import { useDispatch, useSelector } from 'react-redux';
import StatusDot from '../components/StatusDot'; 

function exportHandler(snapshots: []): void { // function that takes in our tabs[currentTab] object to be exported as a JSON file. NOTE: TypeScript needs to be updated
  const fileDownload: HTMLAnchorElement = document.createElement('a'); // invisible HTML element that will hold our tabs[currentTab] object

  fileDownload.href = URL.createObjectURL( // href is the reference to the URL object created from the Blob
    new Blob([JSON.stringify(snapshots)], { type: 'application/json' }), // Blob obj is raw data. The tabs[currentTab] object is stringified so the Blob can access the raw data
  );

  fileDownload.setAttribute('download', 'snapshot.json'); // We set a download attribute with snapshots.json as the file name. This allows us to download the file when the element is 'clicked.' The file will be named snapshots.json once the file is downloaded locally
  fileDownload.click(); // click is a method on all HTML elements that simulates a mouse click, triggering the element's click event

  URL.revokeObjectURL(fileDownload.href); // after file is downloaded, remove the href
}

function importHandler(dispatch: (a: unknown) => void): void { // function handles the importing of a tabs[currentTab] object when the upload button is selected
  const fileUpload = document.createElement('input'); // invisible HTML element that will hold our uploaded tabs[currentTab] object
  fileUpload.setAttribute('type', 'file'); // Attributes added to HTML element

  fileUpload.onchange = (e: Event) => { // onChange is when value of HTML element is changed
    const reader = new FileReader(); // FileReader is an object that reads contents of local files in async. It can use file or blob objects
    const eventFiles = e.target as HTMLInputElement; // uploaded tabs[currentTab] object is stored as the event.target
   
    if (eventFiles) { // if the fileUpload element has an eventFiles
      reader.readAsText(eventFiles.files[0]); // the reader parses the file into a string and stores it within the reader object
    }

    reader.onload = () => {
      const test = reader.result.toString(); // once the local file has been loaded, result property on FileReader object returns the file's contents and then converts the file contents to a string
      return dispatch(importSnapshots(JSON.parse(test))); // dispatch sends the result of of converting our tabs[currentTab] object => string => JSON Object. This updates the current tab
    };
  };

  fileUpload.click(); // click is a method on all HTML elements that simulates a mouse click, triggering the element's click event
}


function ButtonsContainer(): JSX.Element {
  const dispatch = useDispatch();
  const currentTab = useSelector((state: any) => state.main.currentTab);
  const tabs = useSelector((state: any)=>state.main.tabs);
  const currentTabInApp = useSelector((state: any)=> state.main.currentTabInApp);
  const connectionStatus = useSelector((state: any)=> state.main.connectionStatus);
  const { mode: { paused }} = tabs[currentTab];
  //adding a local state using useState for the reconnect button functionality
  const [reconnectDialogOpen, setReconnectDialogOpen] = useState(false);

  //logic for handling dialog box opening and closing
  const handleReconnectClick = () => {
    connectionStatus ? setReconnectDialogOpen(true) : dispatch(startReconnect());
  }

  const handleReconnectConfirm = () => {
    //reconnection logic here
    dispatch(startReconnect());
    setReconnectDialogOpen(false);
  }

  const handleReconnectCancel = () => {
    //closing the dialog
    setReconnectDialogOpen(false);
  }

  return (
    <div className='buttons-container'>
      <Button
        variant='outlined'
        className='pause-button'
        type='button'
        onClick={() => dispatch(toggleMode('paused'))}
      >
        {paused ? <LockIcon sx={{ pr: 1 }} /> : <LockOpenIcon sx={{ pr: 1 }} />}
        {paused ? 'Locked' : 'Unlocked'}
      </Button>
      <Button
        variant='outlined'
        className='export-button'
        type='button'
        onClick={() => exportHandler(tabs[currentTab])}
      >
        <FileDownloadIcon sx={{ pr: 1 }} />
        Download
      </Button>
      <Button variant='outlined' className='import-button' onClick={() => importHandler(dispatch)}>
        <FileUploadIcon sx={{ pr: 1 }} />
        Upload
      </Button>
      {/* The component below renders a button for the tutorial walkthrough of Reactime */}
      <Tutorial
      //commented out so we can use useDispatch in Tutorial.tsx
       dispatch={dispatch} 
       currentTabInApp={currentTabInApp} />
      {/* adding a button for reconnection functionality 10/5/2023 */}
      <Button
        variant='outlined'
        className='reconnect-button'
        type='button'
        //update onClick functionality to include a popup that contains....
        onClick={handleReconnectClick}
        endIcon={
          <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <StatusDot status={connectionStatus ? 'active' : 'inactive'} />
          </span>
        }
        >
        Reconnect
      </Button>
      <Dialog open={reconnectDialogOpen} onClose={handleReconnectCancel}>
          <DialogTitle>Reconnect Confirmation</DialogTitle>
          <DialogContent>
            {/* //insert info here on current connection status */}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleReconnectCancel} color="primary">
              Cancel
            </Button>
            <Button onClick={handleReconnectConfirm} color="primary">
              Confirm Reconnect
            </Button>
          </DialogActions>
        </Dialog>
    </div>
  );
}

export default ButtonsContainer;
