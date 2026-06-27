import { useState, useCallback } from "react";
import { AppointmentRepository } from "../api/appointments.repository";
import { toast } from "sonner";
import { useAuth } from "../../../providers/AuthProvider";

const STATUS = {
  IDLE: "idle",
  CREATING: "creating",
  FETCHING: "fetching",
  UPDATING: "updating",
  ERROR: "error",
};

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined"
  ? new URLSearchParams(window.location.search).get("preview")
  : null;

const MOCK_APPOINTMENTS = [
  {
    id: "mock-1", status: "pending",
    scheduled_date: "2026-06-27", scheduled_time: "09:00:00",
    reason: "Ansiedad y estrés por carga académica del trimestre",
    dependency_id: 1,
    dependencies: { name: "Psicología" },
    profiles: { full_name: "Juan Pérez", document_number: "1034567890" },
  },
  {
    id: "mock-2", status: "confirmed",
    scheduled_date: "2026-06-28", scheduled_time: "14:00:00",
    reason: "Control de tensión arterial y revisión general de salud",
    dependency_id: 2,
    dependencies: { name: "Enfermería" },
    profiles: { full_name: "Juan Pérez", document_number: "1034567890" },
  },
  {
    id: "mock-3", status: "completed",
    scheduled_date: "2026-06-18", scheduled_time: "10:30:00",
    reason: "Orientación sobre subsidio de alimentación y transporte",
    dependency_id: 3,
    dependencies: { name: "Trabajo Social" },
    profiles: { full_name: "Juan Pérez", document_number: "1034567890" },
  },
  {
    id: "mock-4", status: "cancelled",
    scheduled_date: "2026-06-12", scheduled_time: "11:00:00",
    reason: "Dificultades con el proceso de contrato de aprendizaje",
    dependency_id: 3,
    dependencies: { name: "Trabajo Social" },
    profiles: { full_name: "Juan Pérez", document_number: "1034567890" },
  },
];

export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [error, setError] = useState(null);
  const { user, profile } = useAuth();

  const fetchAppointments = useCallback(
    async (filters = {}) => {
      if (DEV_ROLE) {
        setAppointments(MOCK_APPOINTMENTS);
        setStatus(STATUS.IDLE);
        return MOCK_APPOINTMENTS;
      }

      setStatus(STATUS.FETCHING);
      setError(null);

      try {
        const isAprendiz = profile?.roles?.name === "APRENDIZ";
        const roleFilters = isAprendiz
          ? { userId: user.id }
          : { dependencyId: profile?.dependency_id };

        const data = await AppointmentRepository.fetch({ ...roleFilters, ...filters });
        setAppointments(data);
        return data;
      } catch (err) {
        setError(err.message);
        toast.error("Error cargando citas");
        return [];
      } finally {
        setStatus(STATUS.IDLE);
      }
    },
    [user, profile],
  );

  // CREATE: Crear cita con validaciones de negocio
  const createAppointment = async (formData) => {
    setStatus(STATUS.CREATING);

    try {
      // Regla de negocio: Máximo 2 citas pendientes
      if (profile?.roles?.name === "APRENDIZ") {
        const pendingCount = await AppointmentRepository.countPending(user.id);
        if (pendingCount >= 2) {
          throw new Error(
            "Ya tienes 2 citas pendientes. Espera a que se atienda una.",
          );
        }
      }

      // Verificar disponibilidad de horario
      const isAvailable = await AppointmentRepository.checkAvailability(
        formData.dependency_id,
        formData.scheduled_date,
        formData.scheduled_time,
      );

      if (!isAvailable) {
        throw new Error("Este horario ya está ocupado. Selecciona otro.");
      }

      // Crear la cita
      const newAppointment = await AppointmentRepository.create({
        ...formData,
        user_id: user.id,
        status: "pending",
      });

      // OPTIMISTIC UPDATE: Actualizamos UI inmediatamente
      setAppointments((prev) => [...prev, newAppointment]);
      toast.success("Cita agendada correctamente");
      return { success: true, data: newAppointment };
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      return { success: false, error: err.message };
    } finally {
      setStatus(STATUS.IDLE);
    }
  };

  // UPDATE STATUS: Cambiar estado (confirmar, completar, cancelar)
  const updateStatus = async (appointmentId, newStatus, notes = null, cancelledReason = null) => {
    setStatus(STATUS.UPDATING);

    try {
      const updates = { status: newStatus };
      if (notes) updates.notes = notes;
      if (cancelledReason) updates.cancelled_reason = cancelledReason;

      const updated = await AppointmentRepository.update(
        appointmentId,
        updates,
      );

      // Actualizar estado local sin recargar todo
      setAppointments((prev) =>
        prev.map((app) => (app.id === appointmentId ? updated : app)),
      );

      toast.success(
        `Cita ${newStatus === "confirmed" ? "confirmada" : "actualizada"}`,
      );
      return { success: true };
    } catch (err) {
      toast.error("Error actualizando cita");
      return { success: false, error: err.message };
    } finally {
      setStatus(STATUS.IDLE);
    }
  };

  // CANCEL: Cancelar cita (solo si está pending)
  const cancelAppointment = async (appointmentId, cancelledReason = null) => {
    const appointment = appointments.find((a) => a.id === appointmentId);

    if (appointment.status !== "pending") {
      toast.error("Solo puedes cancelar citas pendientes");
      return { success: false };
    }

    return updateStatus(appointmentId, "cancelled", null, cancelledReason);
  };

  return {
    appointments,
    status,
    error,
    isLoading: status === STATUS.FETCHING,
    isCreating: status === STATUS.CREATING,
    fetchAppointments,
    createAppointment,
    updateStatus,
    cancelAppointment,
  };
}
