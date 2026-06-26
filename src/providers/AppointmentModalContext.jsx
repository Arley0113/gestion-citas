import { createContext, useContext, useState } from "react";

const Ctx = createContext(null);

export function useAppointmentModal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppointmentModal debe usarse dentro de AppointmentModalProvider");
  return ctx;
}

export function AppointmentModalProvider({ children }) {
  const [isOpen, setIsOpen]         = useState(false);
  const [preselectedService, setPreselectedService] = useState(null);

  const openModal  = (serviceKey = null) => { setPreselectedService(serviceKey); setIsOpen(true); };
  const closeModal = () => { setIsOpen(false); setPreselectedService(null); };

  return (
    <Ctx.Provider value={{ isOpen, openModal, closeModal, preselectedService }}>
      {children}
    </Ctx.Provider>
  );
}
