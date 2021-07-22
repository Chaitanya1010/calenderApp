import "./App.css";
import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import * as dates from "./dates";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.scss";
import { render } from "@testing-library/react";

// Setup the localizer by providing the moment (or globalize) Object
// to the correct localizer.
const DragAndDropCalendar = withDragAndDrop(Calendar);
const localizer = momentLocalizer(moment);

const MyCalendar = ({ localizer = {}, min = {}, max = {} }) => {
  const [inputEvents, setInputEvents] = useState({
    events: [],
  });
  const [restartTimer, setRestartTimer] = useState(false);
  const [timerId, setTimerId] = useState(-1);
  const [lastResourceActive, setLastResourceActive] = useState(true);

  const getNextId = () => {
    let idList = inputEvents.events.map((a) => a.id);

    if (idList.length !== 0) return Math.max(...idList) + 1;
    else return 0;
  };

  const getLastResourceId = () => {
    if (inputEvents.events.length === 0) return 1;
    return inputEvents.events.map((event) => event.resourceId).sort()[
      inputEvents.events.length - 1
    ];
  };

  const getFirstEventStartTimeInLastResource = () => {
    return inputEvents.events
      .filter((event) => event.resourceId === getLastResourceId())
      .map((event) => event.start)
      .sort()[0];
  };
  console.log(getFirstEventStartTimeInLastResource(), "Events");

  const getResourceMap = () => {
    const resourceMap = [];
    for (let i = 1; i <= getLastResourceId(); i++) {
      if (i === 1)
        resourceMap.push({ resourceId: i, resourceTitle: "Today's Plan" });
      else
        resourceMap.push({
          resourceId: i,
          resourceTitle: `Re-Plan Section #${i - 1}`,
        });
    }
    if (resourceMap.length === 0)
      resourceMap.push({ resourceId: 1, resourceTitle: "Today's Plan" });
    return resourceMap;
  };

  const canAddorChangeEvent = (start, end, resourceId) => {
    console.log("the dates are", new Date() < start, getLastResourceId());
    if (
      resourceId === getLastResourceId() &&
      lastResourceActive &&
      Date.now() < start
    )
      return true;
  };

  const createEvent = ({ start, end, resourceId }) => {
    if (!canAddorChangeEvent(start, end, resourceId)) return false;
    const title = window.prompt("New Event name");
    if (title) {
      //const [displayStartTime, displayEndTime] = getFactoredTimings(start, end);

      setInputEvents((prevState) => {
        return {
          events: [
            ...prevState.events,
            {
              start,
              end,
              title,
              id: getNextId(),
              resourceId: resourceId,
            },
          ],
        };
      });
    }
  };

  const moveEvent = ({ event, start, end, resourceId }) => {
    const events = inputEvents.events;
    const idx = events.indexOf(event);
    let updatedEvent = {};
    const nextEvents = [...events];

    // moving it back to original place if it's replanned or moved from 2 -> 1
    if (
      event.rePlannedStatus ||
      (event.resourceId === 2 && resourceId === 1) ||
      start < min ||
      end > max
    ) {
      if (
        event.start === start &&
        event.end === end &&
        event.resourceId === resourceId
      ) {
        return;
      } else {
        moveEvent({
          event: event,
          start: event.start,
          end: event.end,
          resourceId: event.resourceId,
        });
        return;
      }
    }
    // moving it between cols
    else if (event.resourceId === 1 && event.resourceId !== resourceId) {
      updatedEvent = {
        ...event,
        start,
        end,
        resourceId,
        id: getNextId(),
      };
      nextEvents.push(updatedEvent);

      updatedEvent = { ...event, rePlannedStatus: true };
      nextEvents.splice(idx, 1, updatedEvent);
    }
    // moving it normally
    else {
      //const [displayStartTime, displayEndTime] = getFactoredTimings(start, end);
      updatedEvent = {
        ...event,
        start,
        end,
        resourceId,
      };
      nextEvents.splice(idx, 1, updatedEvent);
    }
    setInputEvents({
      events: nextEvents,
    });
  };

  const resizeEvent = ({ event, start, end }) => {
    console.log("in resize here");

    const events = inputEvents.events;

    // resizing to it's original shape
    if (
      event.rePlannedStatus ||
      start < min ||
      end > max ||
      start - end === 0
    ) {
      if (event.start === start && event.end === end) return;
      else {
        resizeEvent({
          event: event,
          start: event.start,
          end: event.end,
        });
        return;
      }
    }

    //const [displayStartTime, displayEndTime] = getFactoredTimings(start, end);
    const nextEvents = events.map((existingEvent) => {
      return existingEvent.id === event.id
        ? { ...existingEvent, start, end }
        : existingEvent;
    });

    setInputEvents({
      events: nextEvents,
    });
  };

  const deleteSelectedEvent = (event) => {
    if (
      window.confirm(
        `Are you sure you want to delete the ${event.title} - timings ${moment(
          event.start.toISOString()
        ).format("DD-MMM-YYYY HH:mm")} to ${moment(
          event.end.toISOString()
        ).format("DD-MMM-YYYY HH:mm")}`
      )
    ) {
      const idx = inputEvents.events.indexOf(event);
      const nextEvents = [...inputEvents.events];
      nextEvents.splice(idx, 1);
      setInputEvents({
        events: nextEvents,
      });
    }
    //setMin(moment("1:00am", "h:mma").toDate());
  };

  const lockLastActiveSlot = () => {
    console.log(
      "checking",
      getFirstEventStartTimeInLastResource() < new Date(),
      getFirstEventStartTimeInLastResource(),
      lastResourceActive
    );
    if (getFirstEventStartTimeInLastResource() < new Date()) {
      console.log("Internval is cleared and status updates");
      setLastResourceActive(false);
      clearInterval(timerId);
    }
  };

  if (getFirstEventStartTimeInLastResource()) {
    if (
      getFirstEventStartTimeInLastResource() < new Date() &&
      lastResourceActive
    ) {
      console.log("Setting status as false");
      setLastResourceActive(false);
    } else if (lastResourceActive) {
      console.log("Internval is set", timerId);
      if (timerId === -1) {
        setInterval(function () {
          lockLastActiveSlot();
        }, 5000);
        setTimerId(1);
      }
    }
  }

  const getTimeSlotStyle = (event) => {
    let styles =
      event.end - event.start > 900000
        ? {
            margin: "0px",
            padding: "4px",
            fontSize: "20px",
            fontWeight: "bold",
            textAlign: "center",
          }
        : {
            margin: "0px",
            padding: "1px",
            fontSize: "13px",
            fontWeight: "bold",
            textAlign: "center",
          };
    return styles;
  };
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <div style={{ width: "95%" }}>
        <DragAndDropCalendar
          selectable
          localizer={localizer}
          events={inputEvents.events}
          onEventDrop={moveEvent}
          date={new Date()}
          views={["day"]}
          toolbar={false}
          popup={true}
          step={15}
          timeslots={2}
          resizable
          onEventResize={resizeEvent}
          onSelectSlot={createEvent}
          onSelectEvent={deleteSelectedEvent}
          onDragStart={console.log}
          allDayAccessor={false}
          min={min}
          max={max}
          style={{ margin: "24px" }}
          defaultView={"day"}
          dragFromOutsideItem={null}
          resources={getResourceMap()}
          showMultiDayTimes={true}
          resourceIdAccessor="resourceId"
          resourceTitleAccessor="resourceTitle"
          eventPropGetter={(event, start, end, isSelected) => {
            if (event.rePlannedStatus)
              return {
                className: "",
                style: { backgroundColor: "red", opacity: 0.5 },
              };
            if (event.resourceId === 2)
              return {
                className: "",
                style: { backgroundColor: "green" },
              };
            return { className: "", style: { backgroundColor: "#c3e" } };
          }}
          // slotPropGetter={(date, resourceId) => {
          //   if (date < new Date() || resourceId !== getLastResourceId())
          //     return { style: { cursor: "not-allowed" } };
          //   else return { style: { cursor: "pointer" } };
          // }}
          components={{
            day: {
              event: ({ event }) => {
                return (
                  <div className={event.rePlannedStatus ? "disabled-div" : ""}>
                    <p style={getTimeSlotStyle(event)}>{event.title}</p>
                  </div>
                );
              },
            },
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div>
          <button disabled={false}>Replan</button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [min, setMin] = useState(moment("6:00am", "h:mma").toDate());
  const [max, setMax] = useState(moment("6:00pm", "h:mma").toDate());

  const increaseMinHours = () => {
    let changed_min = new Date();
    changed_min.setHours(min.getHours() - 2);
    changed_min.setMinutes(0);
    setMin(changed_min);
  };

  const increaseMaxHours = () => {
    let changed_max = new Date();
    if (max.getHours() === 22) {
      changed_max.setHours(23);
      changed_max.setMinutes(59);
    } else {
      changed_max.setHours(max.getHours() + 2);
      changed_max.setMinutes(0);
    }
    setMax(changed_max);
  };

  return (
    <div className="App">
      <div
        style={{
          width: "60%",
          float: "right",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <button
              style={{ marginTop: "85px" }}
              onClick={increaseMinHours}
              disabled={min.getHours() === 0}
            >
              add hours
            </button>
          </div>
          <div>
            <button
              style={{ marginBottom: "15px" }}
              onClick={increaseMaxHours}
              disabled={max.getHours() === 23 && max.getMinutes() === 59}
            >
              add hours
            </button>
          </div>
        </div>
        <div style={{ width: "80%", marginBottom: "15px" }}>
          <MyCalendar localizer={localizer} min={min} max={max} />
        </div>
      </div>
    </div>
  );
}

export default App;
