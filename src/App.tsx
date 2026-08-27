import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrgProvider } from "@/contexts/OrgContext";
import { ConnectivityProvider } from "@/contexts/ConnectivityContext";


function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <AuthProvider>
          <OrgProvider>
            <ConnectivityProvider>
              <AppRoutes />
            </ConnectivityProvider>
          </OrgProvider>
        </AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;