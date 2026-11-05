import { createContext, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getRedirectPathForRole } from "../helpers/auth";
import { ROLE_DETAILS } from "../config/roles";
import authService from "../services/auth";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const userString = localStorage.getItem("currentUser");
      return userString ? JSON.parse(userString) : null;
    } catch {
      return null;
    }
  });

  const [facility, setFacilityState] = useState(() => {
    try {
      const facString = localStorage.getItem("currentFacility");
      return facString ? JSON.parse(facString) : null;
    } catch {
      return null;
    }
  });

  const [pharmacy, setPharmacyState] = useState(() => {
    try {
      const pharmString = localStorage.getItem("currentPharmacy");
      return pharmString ? JSON.parse(pharmString) : null;
    } catch {
      return null;
    }
  });

  const [project, setProjectState] = useState(() => {
    try {
      const projString = localStorage.getItem("currentProject");
      return projString ? JSON.parse(projString) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(user);

  // Synchronize state if another tab or event modifies localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "currentUser") {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
      if (e.key === "currentFacility") {
        try {
          setFacilityState(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setFacilityState(null);
        }
      }
      if (e.key === "currentPharmacy") {
        try {
          setPharmacyState(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setPharmacyState(null);
        }
      }
      if (e.key === "currentProject") {
        try {
          setProjectState(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setProjectState(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = async (credentials) => {
    const response = await authService.login(credentials);

    if (response?.token) {
      localStorage.setItem("token", response.token);
    }

    const userData = {
      name: response.name,
      username: response.username,
      role: response.role,
      token: response.token,
    };

    localStorage.setItem("currentUser", JSON.stringify(userData));
    setUser(userData);

    const targetRoute = ROLE_DETAILS[userData?.role]?.initialRoute;
    navigate(targetRoute, { replace: true });

    return userData;
  };

  const selectProject = (projectData, navigateToFacility = true) => {
    localStorage.setItem("currentProject", JSON.stringify(projectData));
    setProjectState(projectData);
    if (
      facility &&
      facility.projectId &&
      String(facility.projectId) !== String(projectData?.id)
    ) {
      localStorage.removeItem("currentFacility");
      setFacilityState(null);
      localStorage.removeItem("currentPharmacy");
      setPharmacyState(null);
    }
    if (navigateToFacility) {
      navigate("/select-facility", { replace: true });
    }
  };

  const setProject = (projectData) => {
    if (projectData) {
      localStorage.setItem("currentProject", JSON.stringify(projectData));
    } else {
      localStorage.removeItem("currentProject");
    }
    setProjectState(projectData);
  };

  const selectFacility = (facilityData, navigateToPharmacy = true) => {
    localStorage.setItem("currentFacility", JSON.stringify(facilityData));
    setFacilityState(facilityData);
    if (
      pharmacy &&
      pharmacy.facilityId &&
      String(pharmacy.facilityId) !== String(facilityData?.id)
    ) {
      localStorage.removeItem("currentPharmacy");
      setPharmacyState(null);
    }
    if (navigateToPharmacy) {
      navigate("/select-pharmacy", { replace: true });
    }
  };

  const setFacility = (facilityData) => {
    if (facilityData) {
      localStorage.setItem("currentFacility", JSON.stringify(facilityData));
    } else {
      localStorage.removeItem("currentFacility");
      localStorage.removeItem("currentPharmacy");
      setPharmacyState(null);
    }
    setFacilityState(facilityData);
  };

  const selectPharmacy = (pharmacyData) => {
    localStorage.setItem("currentPharmacy", JSON.stringify(pharmacyData));
    setPharmacyState(pharmacyData);
    const redirectPath = getRedirectPathForRole(user?.role);
    navigate(redirectPath, { replace: true });
  };

  const setPharmacy = (pharmacyData) => {
    if (pharmacyData) {
      localStorage.setItem("currentPharmacy", JSON.stringify(pharmacyData));
    } else {
      localStorage.removeItem("currentPharmacy");
    }
    setPharmacyState(pharmacyData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentFacility");
    localStorage.removeItem("currentPharmacy");
    localStorage.removeItem("currentProject");
    setUser(null);
    setFacilityState(null);
    setPharmacyState(null);
    setProjectState(null);
    navigate("/", { replace: true });
  };

  const contextValue = useMemo(
    () => ({
      user,
      facility,
      pharmacy,
      project,
      isAuthenticated,
      login,
      selectProject,
      setProject,
      selectFacility,
      setFacility,
      selectPharmacy,
      setPharmacy,
      logout,
    }),
    [user, facility, pharmacy, project, isAuthenticated],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export default AuthContext;
