import React from "react";
import { Link } from "react-router-dom";
import "../../styles/notfound.css"; // ou general.css selon ton architecture

export default function NotFound() {
  return (
    <div className="notfound-page">
      <h1>404</h1>
      <h2>Page non trouvée</h2>
      <Link to="/">Retour à l'accueil</Link>
    </div>
  );
}
