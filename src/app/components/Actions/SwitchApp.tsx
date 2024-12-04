import React from 'react';
import Select from 'react-select';
import { setTab } from '../../slices/mainSlice';
//importing these methods for RTK
import { useSelector, useDispatch } from 'react-redux';
import { MainState, RootState } from '../../FrontendTypes';
import { current } from '@reduxjs/toolkit';

/*
  This is the dropdown menu on the left column above the 'clear' button and the state snapshots list. It allows us to switch between which website/application we are currently working on.

  Currently, it doesn't seem to be fully implemented since switching applications doesn't change to snapshots that are relevant into the newly selected application
*/

const SwitchAppDropdown = (): JSX.Element => {
  //here we are adding useSelector and useDispatch for RTK state conversion
  const dispatch = useDispatch();
  const { currentTab, tabs }: MainState = useSelector((state: RootState) => state.main);

  const tabsArray: {}[] = []; // tabsArray is an empty array that will take objects as it's elements
  Object.keys(tabs).forEach((tab) => {
    // We populate our 'tabsArray' with objects derived from the 'tab' that is currently being iterated on.
    tabsArray.unshift({ value: tab, label: tabs[tab].title });
  });

  const currTab: {} = {
    // we create a 'currTab' object and populate it's values from the 'currentTab' that was destructured from our context object
    value: currentTab,
    label: tabs[currentTab].title,
  };
  console.log('tabs', tabs)

  const customStyles: {} = {
    menu: (provided, state): {} => {
      // we define a menu method that takes in two parameters
      const outline: string = state.isSelected ? 'transparent' : 'transparent'; // why does this ternary even matter if the end result is the same?
      const margin: number = 0;

      return { ...provided, outline, margin }; // we return an object that adds the ouline and margin to the provided object
    },
  };

  const customComponents = {
    DropdownIndicator: () => null,
    IndicatorSeparator: () => null, // Removes the separator line
  };

  return (
    <Select
      className='tab-select-container'
      classNamePrefix='tab-select'
      value={currTab}
      styles={customStyles}
      onChange={(e): void => {
        dispatch(setTab(parseInt(e.value, 10)));
      }}
      options={tabsArray}
      isSearchable={false} // Disable search functionality
      menuIsOpen={false} // Prevent dropdown from opening
      components={customComponents}
    />
  );
};

export default SwitchAppDropdown;
