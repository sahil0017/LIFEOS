"""Observer Pattern implementation for Intelligence Engine."""

from typing import List, Dict, Any, Callable, Optional
from abc import ABC, abstractmethod
import asyncio


class Observer(ABC):
    """Abstract base class for Observer pattern."""
    
    @abstractmethod
    async def update(self, subject: 'Subject', data: Dict[str, Any]) -> None:
        """Update observer with data from subject."""
        pass


class Subject(ABC):
    """Abstract base class for Subject in Observer pattern."""
    
    def __init__(self):
        self._observers: List[Observer] = []
    
    def attach(self, observer: Observer) -> None:
        """Attach an observer."""
        if observer not in self._observers:
            self._observers.append(observer)
    
    def detach(self, observer: Observer) -> None:
        """Detach an observer."""
        if observer in self._observers:
            self._observers.remove(observer)
    
    async def notify(self, data: Dict[str, Any]) -> None:
        """Notify all observers."""
        for observer in self._observers:
            await observer.update(self, data)


class ObserverPattern:
    """Concrete implementation of Observer pattern for Intelligence Engine."""
    
    def __init__(self):
        self._subjects: Dict[str, Subject] = {}
        self._observers: Dict[str, Observer] = {}
    
    def create_subject(self, name: str) -> Subject:
        """Create or get a subject."""
        if name not in self._subjects:
            self._subjects[name] = Subject()
        return self._subjects[name]
    
    def register_observer(self, name: str, observer: Observer) -> None:
        """Register an observer."""
        self._observers[name] = observer
    
    def get_observer(self, name: str) -> Optional[Observer]:
        """Get an observer by name."""
        return self._observers.get(name)
    
    async def notify_all(self, subject_name: str, data: Dict[str, Any]) -> None:
        """Notify all observers of a subject."""
        if subject_name in self._subjects:
            await self._subjects[subject_name].notify(data)


class EventObserver(Observer):
    """Observer that reacts to events."""
    
    def __init__(self, callback: Callable[[Dict[str, Any]], None]):
        self._callback = callback
    
    async def update(self, subject: Subject, data: Dict[str, Any]) -> None:
        """Call the callback when updated."""
        result = self._callback(data)
        if asyncio.iscoroutine(result):
            await result


class ModuleObserver(Observer):
    """Observer for module execution events."""
    
    def __init__(self, module_id: str):
        self.module_id = module_id
        self.events: List[Dict[str, Any]] = []
    
    async def update(self, subject: Subject, data: Dict[str, Any]) -> None:
        """Record module events."""
        event = {
            "module_id": self.module_id,
            "subject": subject.__class__.__name__,
            "data": data,
            "timestamp": asyncio.get_event_loop().time(),
        }
        self.events.append(event)
    
    def get_events(self) -> List[Dict[str, Any]]:
        """Get all recorded events."""
        return self.events.copy()
