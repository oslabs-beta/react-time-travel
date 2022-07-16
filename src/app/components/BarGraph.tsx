// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { BarStack, Bar } from '@visx/shape';
import { SeriesPoint } from '@visx/shape/lib/types';
import { Group } from '@visx/group';
import { Grid } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { Text } from '@visx/text';
import { schemeSet3 } from 'd3-scale-chromatic';
import { onHover, onHoverExit, save } from '../actions/actions';
import { useStoreContext } from '../store';

/* TYPESCRIPT */
interface data {
  snapshotId?: string;
}

interface margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface snapshot {
  snapshotId?: string;
  children: [];
  componentData: any;
  name: string;
  state: string;
}

interface TooltipData {
  bar: SeriesPoint<snapshot>;
  key: string;
  index: number;
  height: number;
  width: number;
  x: number;
  y: number;
  color: string;
}

/* DEFAULTS */
const margin = {
  top: 30, right: 30, bottom: 0, left: 50,
};
const axisColor = '#FF6569';
const background = '#242529';
const tooltipStyles = {
  ...defaultStyles,
  minWidth: 60,
  backgroundColor: 'rgba(0,0,0,0.9)',
  color: 'white',
  fontSize: '14px',
  lineHeight: '18px',
  fontFamily: 'Roboto',
};

const BarGraph = props => {
  const [{ tabs, currentTab }, dispatch] = useStoreContext();
  const {
    maxHeight,
    width,
    height,
    data,
    comparison,
    setRoute,
    allRoutes,
    filteredSnapshots,
    snapshot,
    setSnapshot
  } = props;
  const [seriesNameInput, setSeriesNameInput] = useState(`Series ${comparison.length + 1}`);
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<TooltipData>();
  let tooltipTimeout: number;
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });
  console.log(snapshot, '<--current snapshot');

  const keys = Object.keys(data.componentData);
  // console.log('this is data in barGraph.tsx: ', data);
  // console.log('these are the data\'s keys: ', keys);

  // data accessor (used to generate scales) and formatter (add units for on hover box)
  const getSnapshotId = (d: snapshot) => {
    // d coming from data.barstack post filtered data
    // Object.keys(data.barStack[0]).map(keys => if ())
    // console.log('snapshot object here from getSnapshotId: ', d);
    return d.snapshotId;
  };
  // const getComponentKeys = d => {
  //   console.log('snapshot object here from getComponentKeys: ', d);
  //   return d.snapshotId;
  // };
  const formatSnapshotId = id => `Snapshot ID: ${id}`;
  const formatRenderTime = time => `${time} ms `;

  // create visualization SCALES with cleaned data
  const snapshotIdScale = scaleBand<string>({
    domain: data.barStack.map(getSnapshotId),
    padding: 0.2,
  });

  console.log(data, ' <--data');
  console.log(data.maxTotalRender, ' <--data.maxTotalRender');

  const renderingScale = scaleLinear<number>({
    domain: [0, data.maxTotalRender],
    nice: true,
  });

  // const componentsKeys = [];
  // for (let key in data.barStack[0]) {
  //   if (key !== 'route' && key !== 'snapshotId' ) componentsKeys.push(key);
  // }
  // console.log(data.barStack.map(getSnapshotId), '<-- check if getSnapshotId matches componentKeys');
  // console.log(componentsKeys, '<-- componentKeys');

  // const componentScale = scaleBand<string>({
  //   domain: componentsKeys,
  //   padding: 0.2,
  // });

  const colorScale = scaleOrdinal<string>({
    domain: keys,
    range: schemeSet3,
  });

  // setting max dimensions and scale ranges

  // if (snapshot !== 'All Snapshots') {
  //   // let oldHeight = height
  //   height = maxHeight * 50 * 2 + margin.top + 150;
  // }

  const xMax = width - margin.left - margin.right;
  snapshotIdScale.rangeRound([0, xMax]);
  const yMax = height - margin.top - 150;
  renderingScale.range([yMax, 0]);

  console.log(height, '<--height');
  console.log(yMax, '<--yMax');
  console.log(maxHeight, '<--maxHeight');

  const toStorage = {
    currentTab,
    title: tabs[currentTab].title,
    data,
  };
  // use this to animate the save series button. It
  useEffect(() => {
    const saveButtons = document.getElementsByClassName('save-series-button');
    for (let i = 0; i < saveButtons.length; i++) {
      if (tabs[currentTab].seriesSavedStatus === 'saved') {
        saveButtons[i].classList.add('animate');
        console.log('checking saveButtons[i].classList', saveButtons[i].classList);
        saveButtons[i].innerHTML = 'Saved!';
      } else {
        saveButtons[i].innerHTML = 'Save Series';
        saveButtons[i].classList.remove('animate');
      }
    }
  });

  const saveSeriesClickHandler = () => {
    if (tabs[currentTab].seriesSavedStatus === 'inputBoxOpen') {
      const actionNames = document.getElementsByClassName('actionname');
      for (let i = 0; i < actionNames.length; i++) {
        toStorage.data.barStack[i].name = actionNames[i].value;
      }
      dispatch(save(toStorage, seriesNameInput));
      setSeriesNameInput(`Series ${comparison.length}`);
      return;
    }
    dispatch(save(toStorage));
  };
  console.log(data.barStack, 'data.barStack before graph');

  // FTRI9 note - need to ensure text box is not empty before saving
  const textbox = tabs[currentTab].seriesSavedStatus === 'inputBoxOpen' ? <input type="text" id="seriesname" placeholder="Enter Series Name" onChange={e => setSeriesNameInput(e.target.value)} /> : null;
  return (
    <div className="bargraph-position">
      <div className="saveSeriesContainer">
        {textbox}
        <button
          type="button"
          className="save-series-button"
          onClick={saveSeriesClickHandler}
        >
          Save Series
        </button>
        <form className="routesForm" id="routes-formcontrol">
          <label id="routes-dropdown">Select Route: </label>
          <select
            labelId="demo-simple-select-label"
            id="routes-select"
            onChange={e => {
              setRoute(e.target.value);
              setSnapshot('All Snapshots');
              const defaultSnapShot = document.querySelector('#snapshot-select');
              defaultSnapShot.value = 'All Snapshots';
            }}
          >
            <option>
              All Routes
            </option>
            {allRoutes.map(route => (
              <option className="routes">
                {route}
              </option>
            ))}
          </select>
        </form>
        <form className="routesForm" id="routes-formcontrol">
          <label id="routes-dropdown">Select Snapshot: </label>
          <select
            labelId="demo-simple-select-label"
            id="snapshot-select"
            onChange={e => setSnapshot(e.target.value)}
          >
            <option value="All Snapshots">
              All Snapshots
            </option>
            {filteredSnapshots.map(route => (
              <option className="routes">
                {route.snapshotId}
              </option>
            ))}
          </select>
        </form>
      </div>
      <svg ref={containerRef} width={width} height={height}>
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={background}
          rx={14}
        />
        { console.log(data.barStack, 'data.barStack that gives error 1') }
        <Grid
          top={margin.top}
          left={margin.left}
          xScale={snapshotIdScale}
          yScale={renderingScale}
          width={xMax}
          height={yMax}
          stroke="black"
          strokeOpacity={0.1}
          xOffset={snapshotIdScale.bandwidth() / 2}
        />
        { console.log(data.barStack, 'data.barStack that gives error 2') }

        <Group top={margin.top} left={margin.left}>
          <BarStack
            data={data.barStack}
            keys={keys}
            x={getSnapshotId}
            xScale={snapshotIdScale}
            yScale={renderingScale}
            color={colorScale}
          >
            {barStacks => barStacks.map(barStack => barStack.bars.map((bar, idx) => {
              console.log(filteredSnapshots, '<-- filtered snap shots');
              console.log(data, '<-- data from barStacks');
              console.log(data.barStack, '<-- data.barstack');
              console.log(barStacks, '<--barStacks');
              // console.log(width, '<-- width');
              // console.log(height, '<-- height');
              console.log(bar, '<-- bar');
              // Hides new components if components don't exist in previous snapshots.
              if (Number.isNaN(bar.bar[1]) || bar.height < 0) {
                bar.height = 0;
              }
              return (
                <rect
                  key={`bar-stack-${bar.bar.data.snapshotId}-${bar.key}`}
                  x={bar.x}
                  y={bar.y}
                  height={bar.height === 0 ? null : bar.height}
                  width={bar.width}
                  fill={bar.color}
                  /* TIP TOOL EVENT HANDLERS */
                  // Hides tool tip once cursor moves off the current rect.
                  onMouseLeave={() => {
                    dispatch(
                      onHoverExit(data.componentData[bar.key].rtid),
                      (tooltipTimeout = window.setTimeout(() => {
                        hideTooltip();
                      }, 300)),
                    );
                  }}
                  // Cursor position in window updates position of the tool tip.
                  onMouseMove={event => {
                    dispatch(onHover(data.componentData[bar.key].rtid));
                    if (tooltipTimeout) clearTimeout(tooltipTimeout);
                    const top;
                    if (snapshot === 'All Snapshots') {
                      top = event.clientY - margin.top - bar.height;
                    } else {
                      top = event.clientY - margin.top;
                    }
                    console.log(event.clientY, '<-- event.clientY');
                    console.log(bar.height, '<-- bar.height');
                    console.log(top, '<-- top');
                    const left = bar.x + bar.width / 2;
                    showTooltip({
                      tooltipData: bar,
                      tooltipTop: top,
                      tooltipLeft: left,
                    });
                  }}
                />
              );
            }))}
          </BarStack>
        </Group>
        <AxisLeft
          top={margin.top}
          left={margin.left}
          scale={renderingScale}
          stroke={axisColor}
          tickStroke={axisColor}
          strokeWidth={2}
          tickLabelProps={() => ({
            fill: 'rgb(231, 231, 231)',
            fontSize: 11,
            verticalAnchor: 'middle',
            textAnchor: 'end',
          })}
        />
        { console.log(data.barStack, 'data.barStack that gives error 3') }

        <AxisBottom
          top={yMax + margin.top}
          left={margin.left}
          scale={snapshotIdScale}
          stroke={axisColor}
          tickStroke={axisColor}
          strokeWidth={2}
          tickLabelProps={() => ({
            fill: 'rgb(231, 231, 231)',
            fontSize: 11,
            textAnchor: 'middle',
          })}
        />
        <Text
          x={-yMax / 2 - 75}
          y="15"
          transform="rotate(-90)"
          fontSize={12}
          fill="#FFFFFF"
        >
          Rendering Time (ms)
        </Text>
        <br />
        {(snapshot === 'All Snapshots')
          ? (
            <Text x={xMax / 2 + 15} y={yMax + 70} fontSize={12} fill="#FFFFFF">
              Snapshot ID
            </Text>
          )
          : (
            <Text x={xMax / 2 + 15} y={yMax + 70} fontSize={12} fill="#FFFFFF">
              Components
            </Text>
          )}

      </svg>
      {/* FOR HOVER OVER DISPLAY */}
      {/* Ths conditional statement displays a different tooltip
      configuration depending on if we are trying do display a specific
      snapshot through options menu or all snapshots together in bargraph */}
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          key={Math.random()} // update tooltip bounds each render
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <div style={{ color: colorScale(tooltipData.key) }}>
            {' '}
            <strong>{tooltipData.key}</strong>
            {' '}
          </div>
          <div>{data.componentData[tooltipData.key].stateType}</div>
          <div>
            {' '}
            {formatRenderTime(tooltipData.bar.data[tooltipData.key])}
            {' '}
          </div>
          <div>
            {' '}
            <small>
              {formatSnapshotId(getSnapshotId(tooltipData.bar.data))}
            </small>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
};

export default BarGraph;
