import "./App.css";
import React, { useState, useEffect, useRef } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.scss";

// Setup the localizer by providing the moment (or globalize) Object
// to the correct localizer.
const DragAndDropCalendar = withDragAndDrop(Calendar);
const localizer = momentLocalizer(moment);

const useLastResourceInterval = (callback, delay, timerStatus) => {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    let id;
    if (timerStatus) {
      id = setInterval(() => {
        savedCallback.current();
      }, delay);
    } else {
      clearInterval(id);
    }

    return () => clearInterval(id);
  }, [callback, delay, timerStatus]);
};

const lockLastActiveSlot = ({
  getFirstEventStartTimeInLastResource,
  setLastResourceActive,
  setTimerStatus,
}) => {
  if (getFirstEventStartTimeInLastResource() < new Date()) {
    setLastResourceActive(false);
    setTimerStatus(false);
  }
};

const MyCalendar = ({ localizer = {}, min = {}, max = {} }) => {
  const [inputEvents, setInputEvents] = useState({
    events: [],
  });

  const [timerStatus, setTimerStatus] = useState(false);
  const [lastResourceActive, setLastResourceActive] = useState(true);
  const [addNewResourceWithNoEvents, setAddNewResourceWithNoEvents] =
    useState(false);

  useLastResourceInterval(
    () => {
      lockLastActiveSlot({
        getFirstEventStartTimeInLastResource,
        setLastResourceActive,
        setTimerStatus,
      });
    },
    5000,
    timerStatus
  );

  const getFirstEventStartTimeInLastResource = () => {
    return inputEvents.events
      .filter((event) => event.resourceId === getLastResourceId())
      .map((event) => event.start)
      .sort()[0];
  };

  const getNextId = () => {
    let idList = inputEvents.events.map((a) => a.id);

    if (idList.length !== 0) return Math.max(...idList) + 1;
    else return 0;
  };

  const getLastResourceId = () => {
    if (inputEvents.events.length === 0) return 1;
    let lastResourceId = inputEvents.events
      .map((event) => event.resourceId)
      .sort()[inputEvents.events.length - 1];
    if (addNewResourceWithNoEvents) return lastResourceId + 1;
    else return lastResourceId;
  };

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

  const basicCheck = (start, end) => {
    return (
      lastResourceActive && start >= min && end <= max //&& Date.now() < start
    );
  };

  const canAddEvent = (start, end, resourceId) => {
    if (resourceId === getLastResourceId() && basicCheck(start, end))
      return true;
    return false;
  };

  const canMoveEvent = (event, start, end, resourceId) => {
    if (canAddEvent(start, end, resourceId)) {
      if (resourceId === getLastResourceId()) return true;
    }
    return false;
  };

  const checkIfClonedEventExists = (event, resourceId) => {
    const clonedEvents = inputEvents.events.filter(
      (existing_event) =>
        existing_event.resourceId === resourceId &&
        existing_event.clonedId === event.id
    );
    if (clonedEvents.length > 0) return true;
    return false;
  };

  const canResizeEvent = (event, start, end) => {
    if (event.resourceId === getLastResourceId() && basicCheck(start, end)) {
      return true;
    }
    return false;
  };

  const createEvent = ({ start, end, resourceId }) => {
    if (!canAddEvent(start, end, resourceId)) return false;

    const title = window.prompt("New Event name");
    if (title) {
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
      setAddNewResourceWithNoEvents(false);
    }
  };

  const moveEvent = ({ event, start, end, resourceId }) => {
    if (!canMoveEvent(event, start, end, resourceId)) return false;

    const events = inputEvents.events;
    const idx = events.indexOf(event);
    let updatedEvent = {};
    const nextEvents = [...events];

    // move across 2 cols
    console.log("in move event", event, start, end, resourceId);
    if (event.resourceId !== getLastResourceId()) {
      if (checkIfClonedEventExists(event, resourceId)) return false;
      updatedEvent = {
        ...event,
        start,
        end,
        resourceId,
        clonedId: event.id,
        id: getNextId(),
      };
      nextEvents.push(updatedEvent);

      updatedEvent = { ...event, rePlannedStatus: true };
      nextEvents.splice(idx, 1, updatedEvent);
    } else {
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
    if (!canResizeEvent(event, start, end)) return false;

    const events = inputEvents.events;
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

  const replanEvents = () => {
    const upcomingEvents = inputEvents.events.filter(
      (event) =>
        event.resourceId === getLastResourceId() && event.start > new Date()
    );
    if (upcomingEvents.length > 0) {
      const newId = getNextId();
      upcomingEvents.map((upcomingEvent, index) => {
        let addingEvent = {
          start: upcomingEvent.start,
          end: upcomingEvent.end,
          title: upcomingEvent.title,
          clonedId: upcomingEvent.id,
          id: newId + index,
          resourceId: getLastResourceId() + 1,
        };
        setInputEvents((prevState) => {
          return {
            events: [...prevState.events, addingEvent],
          };
        });
        return addingEvent;
      });
    } else {
      setAddNewResourceWithNoEvents(true);
    }
    setLastResourceActive(true);
  };

  if (getFirstEventStartTimeInLastResource()) {
    if (
      getFirstEventStartTimeInLastResource() < new Date() &&
      lastResourceActive
    ) {
      setLastResourceActive(false);
    } else if (lastResourceActive) {
      if (!timerStatus) {
        setTimerStatus(true);
      }
    }
  }

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
            if (event.resourceId !== getLastResourceId())
              return {
                className: "",
                style: {
                  backgroundColor: "#8c8f8d",
                  opacity: 0.7,
                },
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
          // components={{
          //   day: {
          //     event: ({ event }) => {
          //       return (
          //         <div
          //           className={
          //             event.resourceId !== getLastResourceId()
          //               ? "disabled-div"
          //               : ""
          //           }
          //         >
          //           <p style={getTimeSlotStyle(event)}>{event.title}</p>
          //         </div>
          //       );
          //     },
          //   },
          // }}
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
          <button disabled={lastResourceActive} onClick={replanEvents}>
            Replan
          </button>
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
