import { useEffect, useState } from "react";

const configuredApiBase = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || "");

const defaultLocationForm = {
  id: "",
  name: "",
  details: "",
  robotCanNavigate: false,
  isCurrentlyAvailable: false
};

const defaultStoreInfoForm = {
  id: "",
  title: "",
  kind: "general",
  value: "",
  startsAt: "",
  endsAt: "",
  isActive: true
};

const defaultRobotSyncText = "";

const defaultCatalogForm = {
  id: "",
  name: "",
  description: ""
};

const AVAILABLE_CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

const defaultVariant = () => ({ label: "", price: "", currency: "EUR" });

const defaultProductForm = {
  id: "",
  name: "",
  description: "",
  imageUrl: "",
  isNew: false,
  variants: [defaultVariant()]
};

function normalizeApiBase(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

function parseAliases(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseRobotSyncText(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [externalRobotId = "", name = "", zone = "", details = "", aliases = ""] = line
        .split("|")
        .map((part) => part.trim());

      return {
        externalRobotId,
        name,
        zone,
        details,
        aliases: parseAliases(aliases),
        robotCanNavigate: true
      };
    })
    .filter((item) => item.externalRobotId && item.name);
}

function mapLocationToForm(location) {
  return {
    id: location.id || "",
    name: location.name || "",
    details: location.details || location.description || location.zone || "",
    robotCanNavigate: Boolean(location.robotCanNavigate),
    isCurrentlyAvailable: Boolean(location.isCurrentlyAvailable)
  };
}

function mapStoreInfoToForm(entry) {
  return {
    id: entry.id || "",
    title: entry.title || "",
    kind: entry.kind || "general",
    value: entry.value || "",
    startsAt: entry.startsAt ? String(entry.startsAt).slice(0, 16) : "",
    endsAt: entry.endsAt ? String(entry.endsAt).slice(0, 16) : "",
    isActive: true
  };
}

function mapCatalogToForm(catalog) {
  return {
    id: catalog.id || "",
    name: catalog.name || "",
    description: catalog.description || ""
  };
}

function mapProductToForm(product) {
  const variants = Array.isArray(product.variants) && product.variants.length
    ? product.variants.map((variant) => ({
        label: variant.label || "",
        price: variant.price === null || variant.price === undefined ? "" : String(variant.price),
        currency: variant.currency || "EUR"
      }))
    : [defaultVariant()];

  return {
    id: product.id || "",
    name: product.name || "",
    description: product.description || "",
    imageUrl: product.imageUrl || "",
    isNew: Boolean(product.isNew),
    variants
  };
}

function formatVariantsDisplay(variants) {
  if (!Array.isArray(variants) || !variants.length) {
    return "Aucun prix renseigné";
  }
  if (variants.length === 1) {
    return formatPriceDisplay(variants[0].price, variants[0].currency);
  }
  const cheapest = variants.slice().sort((left, right) => left.price - right.price)[0];
  return `À partir de ${formatPriceDisplay(cheapest.price, cheapest.currency)} (${variants.length} formats)`;
}

function formatPriceDisplay(price, currency) {
  if (price === null || price === undefined || price === "") {
    return "Prix non renseigné";
  }
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "EUR" }).format(price);
  } catch {
    return `${price} ${currency || "EUR"}`;
  }
}

async function request(apiBase, path, options = {}) {
  const response = await fetch(`${normalizeApiBase(apiBase)}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.error || `Erreur HTTP ${response.status}`);
  }

  return data;
}

async function uploadImageFile(apiBase, file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${normalizeApiBase(apiBase)}/api/admin/products/upload-image`, {
    method: "POST",
    body: formData
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.error || `Erreur HTTP ${response.status}`);
  }

  return data;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Erreur inconnue");
}

function StatusPill({ online }) {
  return (
    <span className={`status-pill ${online ? "status-pill--ok" : "status-pill--off"}`}>
      {online ? "Backend connecté" : "Backend non vérifié"}
    </span>
  );
}

function RobotLocationModal({
  isOpen,
  locationForm,
  loading,
  onClose,
  onLocationFormChange,
  onSubmit
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Lieu robot</p>
            <h2>{locationForm.name || "Edition du lieu"}</h2>
          </div>
          <button className="button button--ghost" type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <p className="section-copy">
          Renseigne ici les précisions utiles sur ce lieu. Les catalogues de produits présents ici se gèrent depuis la
          section Catalogues.
        </p>

        <form className="stack-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>Nom du lieu</span>
              <input
                value={locationForm.name}
                onChange={(event) => onLocationFormChange({ ...locationForm, name: event.target.value })}
                required
              />
            </label>
            <label className="field field--full">
              <span>Informations sur le lieu</span>
              <textarea
                rows="3"
                value={locationForm.details}
                onChange={(event) => onLocationFormChange({ ...locationForm, details: event.target.value })}
              />
            </label>
          </div>

          <button className="button" type="submit" disabled={loading}>
            Enregistrer ce lieu
          </button>
        </form>
      </div>
    </div>
  );
}

function ManualLocationModal({
  isOpen,
  locationForm,
  loading,
  onClose,
  onLocationFormChange,
  onSubmit
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Lieu manuel</p>
            <h2>{locationForm.name || "Nouveau lieu manuel"}</h2>
          </div>
          <button className="button button--ghost" type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <p className="section-copy">
          Ajoute ici un lieu connu du magasin que le robot ne peut pas atteindre, mais sur lequel il doit pouvoir informer
          le client.
        </p>

        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field">
            <span>Nom du lieu</span>
            <input
              value={locationForm.name}
              onChange={(event) => onLocationFormChange({ ...locationForm, name: event.target.value })}
              required
            />
          </label>
          <label className="field field--full">
            <span>Informations sur le lieu</span>
            <textarea
              rows="3"
              value={locationForm.details}
              onChange={(event) => onLocationFormChange({ ...locationForm, details: event.target.value })}
            />
          </label>
          <button className="button" type="submit" disabled={loading}>
            Enregistrer le lieu manuel
          </button>
        </form>
      </div>
    </div>
  );
}

function CatalogModal({
  isOpen,
  catalogForm,
  locations,
  selectedLocationIds,
  products,
  loading,
  onClose,
  onCatalogFormChange,
  onToggleLocation,
  onSubmit,
  onAddProduct,
  onEditProduct,
  onDeleteProduct
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Catalogue</p>
            <h2>{catalogForm.name || "Nouveau catalogue"}</h2>
          </div>
          <button className="button button--ghost" type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <p className="section-copy">
          Un catalogue regroupe des produits (ex: « Sacs à main ») et se relie à un ou plusieurs lieux du magasin pour
          que le robot sache où l'orienter.
        </p>

        <form className="stack-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>Nom du catalogue</span>
              <input
                value={catalogForm.name}
                onChange={(event) => onCatalogFormChange({ ...catalogForm, name: event.target.value })}
                required
              />
            </label>
            <label className="field field--full">
              <span>Description</span>
              <textarea
                rows="2"
                value={catalogForm.description}
                onChange={(event) => onCatalogFormChange({ ...catalogForm, description: event.target.value })}
              />
            </label>
          </div>

          <label className="field">
            <span>Lieux associés</span>
            <small>Le robot orientera le client vers l'un de ces lieux pour les produits de ce catalogue.</small>
            <div className="checkbox-list">
              {locations.map((location) => (
                <label key={location.id} className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={selectedLocationIds.includes(String(location.id))}
                    onChange={() => onToggleLocation(String(location.id))}
                  />
                  <span>{location.name}</span>
                </label>
              ))}
              {!locations.length ? <small>Aucun lieu configuré pour le moment.</small> : null}
            </div>
          </label>

          <button className="button" type="submit" disabled={loading}>
            Enregistrer le catalogue
          </button>
        </form>

        {catalogForm.id ? (
          <div className="product-section">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Produits</p>
                <h2>Produits du catalogue</h2>
              </div>
              <button className="button button--ghost" type="button" onClick={onAddProduct}>
                Ajouter un produit
              </button>
            </div>

            <div className="product-grid">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  {product.imageUrl ? (
                    <img className="product-card__image" src={product.imageUrl} alt={product.name} />
                  ) : (
                    <div className="product-card__image product-card__image--placeholder">Pas d'image</div>
                  )}
                  <div className="product-card__body">
                    <strong>
                      {product.name}
                      {product.isNew ? <span className="pill-inline pill-inline--new">Nouveau</span> : null}
                    </strong>
                    <span>{product.description || "Aucune description"}</span>
                    <small>{formatVariantsDisplay(product.variants)}</small>
                  </div>
                  <div className="product-card__actions">
                    <button className="button button--ghost" type="button" onClick={() => onEditProduct(product)}>
                      Modifier
                    </button>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => onDeleteProduct(product)}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
              {!products.length ? (
                <div className="empty-state">Aucun produit dans ce catalogue pour le moment.</div>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="section-copy">Enregistre d'abord le catalogue pour pouvoir y ajouter des produits.</p>
        )}
      </div>
    </div>
  );
}

function ProductModal({
  isOpen,
  productForm,
  loading,
  imageUploading,
  onClose,
  onProductFormChange,
  onImageFileSelected,
  onSubmit
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Produit</p>
            <h2>{productForm.name || "Nouveau produit"}</h2>
          </div>
          <button className="button button--ghost" type="button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field">
            <span>Nom du produit</span>
            <input
              value={productForm.name}
              onChange={(event) => onProductFormChange({ ...productForm, name: event.target.value })}
              required
            />
          </label>
          <label className="field field--full">
            <span>Description</span>
            <textarea
              rows="3"
              value={productForm.description}
              onChange={(event) => onProductFormChange({ ...productForm, description: event.target.value })}
            />
          </label>
          <label className="field field--full">
            <span>Image du produit</span>
            <small>{imageUploading ? "Envoi de l'image en cours..." : "Formats acceptés : JPG, PNG, WEBP, GIF (8 Mo max)"}</small>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={imageUploading}
              onChange={(event) => onImageFileSelected(event.target.files?.[0] || null)}
            />
          </label>
          {productForm.imageUrl ? (
            <div className="field field--full">
              <img className="product-preview" src={productForm.imageUrl} alt="Aperçu produit" />
            </div>
          ) : null}

          <label className="checkbox-field field--full">
            <input
              type="checkbox"
              checked={productForm.isNew}
              onChange={(event) => onProductFormChange({ ...productForm, isNew: event.target.checked })}
            />
            <span>Marquer ce produit comme nouveau</span>
          </label>

          <div className="field field--full">
            <span>Prix</span>
            <small>
              Un produit simple n'a qu'une ligne. Ajoute des lignes pour un produit décliné en plusieurs formats (ex:
              parfum en 100ml/200ml/500ml), chacune avec son propre prix.
            </small>
            <div className="variant-list">
              {productForm.variants.map((variant, index) => (
                <div key={index} className="variant-row">
                  <input
                    className="variant-row__label"
                    placeholder={productForm.variants.length > 1 ? "Format (ex: 100ml)" : "Format (optionnel)"}
                    value={variant.label}
                    onChange={(event) => {
                      const nextVariants = productForm.variants.slice();
                      nextVariants[index] = { ...variant, label: event.target.value };
                      onProductFormChange({ ...productForm, variants: nextVariants });
                    }}
                  />
                  <input
                    className="variant-row__price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Prix"
                    value={variant.price}
                    onChange={(event) => {
                      const nextVariants = productForm.variants.slice();
                      nextVariants[index] = { ...variant, price: event.target.value };
                      onProductFormChange({ ...productForm, variants: nextVariants });
                    }}
                    required
                  />
                  <select
                    className="variant-row__currency"
                    value={variant.currency}
                    onChange={(event) => {
                      const nextVariants = productForm.variants.slice();
                      nextVariants[index] = { ...variant, currency: event.target.value };
                      onProductFormChange({ ...productForm, variants: nextVariants });
                    }}
                  >
                    {AVAILABLE_CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                  {productForm.variants.length > 1 ? (
                    <button
                      className="button button--ghost variant-row__remove"
                      type="button"
                      onClick={() => {
                        const nextVariants = productForm.variants.filter((_, variantIndex) => variantIndex !== index);
                        onProductFormChange({ ...productForm, variants: nextVariants });
                      }}
                    >
                      Retirer
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              className="button button--ghost"
              type="button"
              onClick={() =>
                onProductFormChange({ ...productForm, variants: [...productForm.variants, defaultVariant()] })
              }
            >
              Ajouter un format
            </button>
          </div>

          <button className="button" type="submit" disabled={loading}>
            Enregistrer le produit
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [apiBase, setApiBase] = useState(() => {
    const storedApiBase = localStorage.getItem("nono-api-base") || "";
    return normalizeApiBase(configuredApiBase || storedApiBase);
  });
  const [backendOnline, setBackendOnline] = useState(false);
  const [locations, setLocations] = useState([]);
  const [storeInfo, setStoreInfo] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [locationForm, setLocationForm] = useState(defaultLocationForm);
  const [robotSyncText, setRobotSyncText] = useState(localStorage.getItem("nono-robot-sync-text") || defaultRobotSyncText);
  const [storeInfoForm, setStoreInfoForm] = useState(defaultStoreInfoForm);
  const [catalogForm, setCatalogForm] = useState(defaultCatalogForm);
  const [catalogLocationIds, setCatalogLocationIds] = useState([]);
  const [productForm, setProductForm] = useState(defaultProductForm);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("neutral");
  const [loading, setLoading] = useState(false);
  const [deletingCatalogId, setDeletingCatalogId] = useState(null);

  function notifySuccess(message) {
    setFeedback(message);
    setFeedbackType("success");
  }

  function notifyError(error) {
    setFeedback(getErrorMessage(error));
    setFeedbackType("error");
  }
  const [autoSyncDone, setAutoSyncDone] = useState(false);
  const [isRobotLocationModalOpen, setIsRobotLocationModalOpen] = useState(false);
  const [isManualLocationModalOpen, setIsManualLocationModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [killswitchEnabled, setKillswitchEnabled] = useState(false);
  const [killswitchLoading, setKillswitchLoading] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        request(apiBase, "/health"),
        request(apiBase, "/api/locations"),
        request(apiBase, "/api/store-info"),
        request(apiBase, "/api/catalogs"),
        request(apiBase, "/api/killswitch")
      ]);

      const [healthResult, locationsResult, storeInfoResult, catalogsResult, killswitchResult] = results;
      const health = healthResult.status === "fulfilled" ? healthResult.value : null;
      const locationsResponse = locationsResult.status === "fulfilled" ? locationsResult.value : null;
      const storeInfoResponse = storeInfoResult.status === "fulfilled" ? storeInfoResult.value : null;
      const catalogsResponse = catalogsResult.status === "fulfilled" ? catalogsResult.value : null;
      const killswitchResponse = killswitchResult.status === "fulfilled" ? killswitchResult.value : null;

      setBackendOnline(health?.status === "ok");
      setLocations(locationsResponse?.locations || []);
      setStoreInfo(storeInfoResponse?.entries || []);
      setCatalogs(catalogsResponse?.catalogs || []);
      setKillswitchEnabled(Boolean(killswitchResponse?.enabled));

      const errors = results
        .filter((result) => result.status === "rejected")
        .map((result) => getErrorMessage(result.reason));

      if (!health) {
        notifyError(errors[0] || "Backend inaccessible.");
      } else if (errors.length) {
        notifyError(`Backend connecté, mais incomplet : ${errors.join(" | ")}`);
      } else {
        notifySuccess("Données chargées.");
      }
    } catch (error) {
      setBackendOnline(false);
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    localStorage.setItem("nono-api-base", normalizeApiBase(apiBase));
  }, [apiBase]);

  useEffect(() => {
    localStorage.setItem("nono-robot-sync-text", robotSyncText);
  }, [robotSyncText]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (autoSyncDone) {
      return;
    }

    const locations = parseRobotSyncText(robotSyncText);
    if (!locations.length) {
      setAutoSyncDone(true);
      return;
    }

    async function autoSyncRobotLocations() {
      setLoading(true);
      try {
        await request(apiBase, "/api/robot/locations/sync", {
          method: "POST",
          body: JSON.stringify({ locations })
        });
        await loadAll();
        notifySuccess("Lieux robot synchronisés automatiquement à l'ouverture.");
      } catch (error) {
        notifyError(`Synchronisation auto échouée : ${getErrorMessage(error)}`);
      } finally {
        setAutoSyncDone(true);
        setLoading(false);
      }
    }

    autoSyncRobotLocations();
  }, [apiBase, autoSyncDone, robotSyncText]);

  async function handleLocationSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...locationForm,
        details: locationForm.details || ""
      };

      const response = await request(apiBase, "/api/admin/locations/upsert", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setLocationForm(mapLocationToForm(response.location));
      setSelectedLocationId(String(response.location.id));
      await loadAll();
      notifySuccess("Lieu enregistré.");
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRobotLocationModalSubmit(event) {
    event.preventDefault();
    if (!selectedLocationId) {
      notifyError("Aucun lieu robot sélectionné.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...locationForm,
        details: locationForm.details || ""
      };

      await request(apiBase, "/api/admin/locations/upsert", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      await loadAll();
      notifySuccess("Lieu robot enrichi.");
      setIsRobotLocationModalOpen(false);
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualLocationModalSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...locationForm,
        robotCanNavigate: false,
        details: locationForm.details || ""
      };

      await request(apiBase, "/api/admin/locations/upsert", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      await loadAll();
      notifySuccess("Lieu manuel enregistré.");
      setIsManualLocationModalOpen(false);
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLocation(location) {
    const confirmed = window.confirm(`Supprimer le lieu « ${location.name} » ?`);
    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      await request(apiBase, "/api/admin/locations/delete", {
        method: "POST",
        body: JSON.stringify({ id: location.id })
      });

      if (String(selectedLocationId) === String(location.id)) {
        setSelectedLocationId(null);
        setIsRobotLocationModalOpen(false);
        setIsManualLocationModalOpen(false);
      }

      await loadAll();
      notifySuccess("Lieu supprimé.");
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRobotSyncSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await request(apiBase, "/api/robot/locations/sync", {
        method: "POST",
        body: JSON.stringify({
          locations: parseRobotSyncText(robotSyncText)
        })
      });
      await loadAll();
      notifySuccess("Synchronisation robot effectuée.");
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStoreInfoSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await request(apiBase, "/api/admin/store-info/upsert", {
        method: "POST",
        body: JSON.stringify({
          ...storeInfoForm,
          startsAt: storeInfoForm.startsAt || null,
          endsAt: storeInfoForm.endsAt || null
        })
      });
      await loadAll();
      notifySuccess("Information magasin enregistrée.");
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  function openNewCatalogModal() {
    setCatalogForm(defaultCatalogForm);
    setCatalogLocationIds([]);
    setIsCatalogModalOpen(true);
  }

  function openExistingCatalogModal(catalog) {
    setCatalogForm(mapCatalogToForm(catalog));
    setCatalogLocationIds((catalog.locations || []).map((location) => String(location.id)));
    setIsCatalogModalOpen(true);
  }

  function toggleCatalogLocation(locationId) {
    setCatalogLocationIds((current) =>
      current.includes(locationId) ? current.filter((id) => id !== locationId) : [...current, locationId]
    );
  }

  async function handleCatalogSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await request(apiBase, "/api/admin/catalogs/upsert", {
        method: "POST",
        body: JSON.stringify(catalogForm)
      });

      const savedCatalog = response.catalog;
      setCatalogForm(mapCatalogToForm(savedCatalog));

      await request(apiBase, "/api/admin/catalog-locations/replace", {
        method: "POST",
        body: JSON.stringify({
          catalogId: savedCatalog.id,
          locations: catalogLocationIds.map((locationId, index) => ({
            locationId,
            priority: (index + 1) * 10
          }))
        })
      });

      await loadAll();
      notifySuccess("Catalogue enregistré.");
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCatalog(catalog) {
    const productCount = (catalog.products || []).length;
    const confirmed = window.confirm(
      `Supprimer le catalogue « ${catalog.name} » ? ${
        productCount
          ? `Les ${productCount} produit(s) qu'il contient et qui ne sont dans aucun autre catalogue seront aussi supprimés.`
          : ""
      }`
    );
    if (!confirmed) {
      return;
    }

    setDeletingCatalogId(catalog.id);
    try {
      await request(apiBase, "/api/admin/catalogs/delete", {
        method: "POST",
        body: JSON.stringify({ id: catalog.id })
      });

      if (String(catalogForm.id) === String(catalog.id)) {
        setIsCatalogModalOpen(false);
      }

      await loadAll();
      notifySuccess("Catalogue supprimé.");
    } catch (error) {
      notifyError(error);
    } finally {
      setDeletingCatalogId(null);
    }
  }

  function openNewProductModal() {
    setProductForm(defaultProductForm);
    setIsProductModalOpen(true);
  }

  function openExistingProductModal(product) {
    setProductForm(mapProductToForm(product));
    setIsProductModalOpen(true);
  }

  async function handleProductImageSelected(file) {
    if (!file) {
      return;
    }

    setImageUploading(true);
    try {
      const result = await uploadImageFile(apiBase, file);
      setProductForm((current) => ({ ...current, imageUrl: result.imageUrl }));
      notifySuccess("Image envoyée.");
    } catch (error) {
      notifyError(error);
    } finally {
      setImageUploading(false);
    }
  }

  async function handleToggleProductIsNew(product) {
    const parentCatalog = catalogs.find((catalog) =>
      (catalog.products || []).some((catalogProduct) => String(catalogProduct.id) === String(product.id))
    );
    if (!parentCatalog) {
      return;
    }

    setLoading(true);
    try {
      const response = await request(apiBase, "/api/admin/catalog-products/replace", {
        method: "POST",
        body: JSON.stringify({
          catalogId: parentCatalog.id,
          products: (parentCatalog.products || []).map((existingProduct, index) => ({
            id: existingProduct.id,
            name: existingProduct.name,
            description: existingProduct.description,
            imageUrl: existingProduct.imageUrl,
            isNew: String(existingProduct.id) === String(product.id) ? !existingProduct.isNew : existingProduct.isNew,
            variants: existingProduct.variants,
            priority: (index + 1) * 10
          }))
        })
      });

      setCatalogs(response.catalogs || []);
      notifySuccess(product.isNew ? "Produit retiré des nouveautés." : "Produit marqué comme nouveau.");
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProductFromCatalog(product) {
    if (!catalogForm.id) {
      return;
    }
    const confirmed = window.confirm(`Retirer « ${product.name} » de ce catalogue ?`);
    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      const currentCatalog = catalogs.find((catalog) => String(catalog.id) === String(catalogForm.id));
      const remainingProducts = (currentCatalog?.products || []).filter(
        (existingProduct) => String(existingProduct.id) !== String(product.id)
      );

      const response = await request(apiBase, "/api/admin/catalog-products/replace", {
        method: "POST",
        body: JSON.stringify({
          catalogId: catalogForm.id,
          products: remainingProducts.map((existingProduct, index) => ({
            id: existingProduct.id,
            name: existingProduct.name,
            description: existingProduct.description,
            imageUrl: existingProduct.imageUrl,
            isNew: existingProduct.isNew,
            variants: existingProduct.variants,
            priority: (index + 1) * 10
          }))
        })
      });

      setCatalogs(response.catalogs || []);
      notifySuccess("Produit retiré du catalogue.");
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleProductSubmit(event) {
    event.preventDefault();
    if (!catalogForm.id) {
      notifyError("Enregistre d'abord le catalogue.");
      return;
    }

    setLoading(true);
    try {
      const currentCatalog = catalogs.find((catalog) => String(catalog.id) === String(catalogForm.id));
      const existingProducts = (currentCatalog?.products || []).filter(
        (existingProduct) => String(existingProduct.id) !== String(productForm.id)
      );

      const cleanedVariants = productForm.variants
        .filter((variant) => variant.price !== "")
        .map((variant, variantIndex) => ({
          label: variant.label || "Standard",
          price: Number(variant.price),
          currency: variant.currency || "EUR",
          priority: (variantIndex + 1) * 10
        }));

      if (!cleanedVariants.length) {
        notifyError("Renseigne au moins un prix.");
        setLoading(false);
        return;
      }

      const nextProducts = [
        ...existingProducts.map((existingProduct) => ({
          id: existingProduct.id,
          name: existingProduct.name,
          description: existingProduct.description,
          imageUrl: existingProduct.imageUrl,
          isNew: existingProduct.isNew,
          variants: existingProduct.variants
        })),
        {
          id: productForm.id || undefined,
          name: productForm.name,
          description: productForm.description || "",
          imageUrl: productForm.imageUrl || "",
          isNew: Boolean(productForm.isNew),
          variants: cleanedVariants
        }
      ].map((product, index) => ({ ...product, priority: (index + 1) * 10 }));

      const response = await request(apiBase, "/api/admin/catalog-products/replace", {
        method: "POST",
        body: JSON.stringify({
          catalogId: catalogForm.id,
          products: nextProducts
        })
      });

      setCatalogs(response.catalogs || []);
      notifySuccess("Produit enregistré.");
      setIsProductModalOpen(false);
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleKillswitchToggle() {
    const nextEnabled = !killswitchEnabled;
    const confirmed = window.confirm(
      nextEnabled
        ? "Activer le killswitch va rendre l'application du robot inutilisable (écran blanc). Continuer ?"
        : "Désactiver le killswitch va rendre l'application du robot de nouveau utilisable. Continuer ?"
    );
    if (!confirmed) {
      return;
    }

    setKillswitchLoading(true);
    try {
      const state = await request(apiBase, "/api/admin/killswitch/set", {
        method: "POST",
        body: JSON.stringify({ enabled: nextEnabled })
      });
      setKillswitchEnabled(Boolean(state?.enabled));
      notifySuccess(nextEnabled ? "Killswitch activé." : "Killswitch désactivé.");
    } catch (error) {
      notifyError(error);
    } finally {
      setKillswitchLoading(false);
    }
  }

  const newProducts = catalogs
    .flatMap((catalog) => (catalog.products || []).map((product) => ({ ...product, catalogName: catalog.name })))
    .filter((product) => product.isNew)
    .filter((product, index, all) => all.findIndex((other) => String(other.id) === String(product.id)) === index);

  const selectedLocation = locations.find((location) => String(location.id) === String(selectedLocationId));
  const availableCount = locations.filter((location) => location.isCurrentlyAvailable).length;
  const navigableCount = locations.filter((location) => location.robotCanNavigate).length;
  const robotLocations = locations.filter((location) => location.robotCanNavigate);
  const manualLocations = locations.filter((location) => !location.robotCanNavigate);

  return (
    <div className="page-shell">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Nono robot</p>
          <h1>Backoffice magasin</h1>
          <p className="hero-copy">
            Configure les lieux, les produits associés, les points réellement atteignables par le robot et les
            informations générales du magasin.
          </p>
        </div>

        <div className="hero-side">
          <StatusPill online={backendOnline} />
          <button className="button button--ghost" onClick={loadAll} disabled={loading}>
            {loading ? "Chargement..." : "Rafraîchir"}
          </button>
          <button
            className={`button ${killswitchEnabled ? "button--danger" : "button--ghost"}`}
            onClick={handleKillswitchToggle}
            disabled={killswitchLoading}
          >
            {killswitchLoading
              ? "..."
              : killswitchEnabled
                ? "Désactiver le killswitch"
                : "Activer le killswitch"}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Lieux connus</span>
          <strong>{locations.length}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Guidage possible</span>
          <strong>{navigableCount}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Disponibles maintenant</span>
          <strong>{availableCount}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Infos magasin</span>
          <strong>{storeInfo.length}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Catalogues</span>
          <strong>{catalogs.length}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Nouveaux produits</span>
          <strong>{newProducts.length}</strong>
        </article>
      </div>

      <div className={`feedback-bar feedback-bar--${feedback ? feedbackType : "neutral"}`}>
        {feedback || "Prêt."}
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Robot</p>
              <h2>Lieux récupérés via le robot</h2>
            </div>
          </div>

          <p className="section-copy">
            Ces lieux viennent du robot. Ils représentent les points réellement navigables et leur disponibilité
            actuelle.
          </p>

          <div className="location-list">
            {robotLocations.map((location) => (
              <div
                key={location.id}
                className={`location-card ${String(location.id) === String(selectedLocationId) ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  className="location-card__body"
                  onClick={() => {
                    setSelectedLocationId(String(location.id));
                    setLocationForm(mapLocationToForm(location));
                    setIsRobotLocationModalOpen(true);
                  }}
                >
                  <div className="location-card__top">
                    <strong>{location.name}</strong>
                    <span className={`dot ${location.isCurrentlyAvailable ? "dot--green" : "dot--amber"}`} />
                  </div>
                  <span>{location.details || location.description || "Aucune information renseignée"}</span>
                  <small>
                    {location.robotCanNavigate ? "Guidage possible" : "Info seule"} ·{" "}
                    {location.isCurrentlyAvailable ? "Disponible" : "Indisponible"}
                  </small>
                </button>
                <button
                  type="button"
                  className="button button--ghost button--danger location-card__delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteLocation(location);
                  }}
                >
                  Supprimer
                </button>
              </div>
            ))}
            {!robotLocations.length ? (
              <div className="empty-state">
                Aucun lieu reçu du robot pour le moment. Ouvre l’accueil de l’app robot pour lancer la synchronisation.
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Manuel</p>
              <h2>Lieux ajoutés manuellement</h2>
            </div>
            <button
              className="button button--ghost"
              onClick={() => {
                setLocationForm({
                  ...defaultLocationForm,
                  robotCanNavigate: false
                });
                setSelectedLocationId("");
                setIsManualLocationModalOpen(true);
              }}
            >
              Nouveau lieu manuel
            </button>
          </div>

          <p className="section-copy">
            Ajoute ici les lieux que le robot ne peut pas atteindre mais dont il doit connaître l’existence.
          </p>

          <div className="location-list">
            {manualLocations.map((location) => (
              <div
                key={location.id}
                className={`location-card ${String(location.id) === String(selectedLocationId) ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  className="location-card__body"
                  onClick={() => {
                    setSelectedLocationId(String(location.id));
                    setLocationForm(mapLocationToForm(location));
                    setIsManualLocationModalOpen(true);
                  }}
                >
                  <div className="location-card__top">
                    <strong>{location.name}</strong>
                    <span className="pill-inline">Info seule</span>
                  </div>
                  <span>{location.details || location.description || "Aucune information renseignée"}</span>
                  <small>Lieu non navigable par le robot</small>
                </button>
                <button
                  type="button"
                  className="button button--ghost button--danger location-card__delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteLocation(location);
                  }}
                >
                  Supprimer
                </button>
              </div>
            ))}
            {!manualLocations.length ? (
              <div className="empty-state">
                Aucun lieu manuel pour l’instant. Crée ici les espaces connus du magasin non atteignables par le robot.
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel panel--wide">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Catalogues</p>
              <h2>Catalogues de produits</h2>
            </div>
            <button className="button button--ghost" onClick={openNewCatalogModal}>
              Nouveau catalogue
            </button>
          </div>

          <p className="section-copy">
            Un catalogue regroupe des produits (ex: « Sacs à main ») et se relie à un ou plusieurs lieux. Quand un
            client cherche un produit, le robot retrouve son catalogue puis propose de le guider au lieu associé.
          </p>

          <div className="location-list">
            {catalogs.map((catalog) => (
              <div key={catalog.id} className="location-card">
                <button
                  type="button"
                  className="location-card__body"
                  onClick={() => openExistingCatalogModal(catalog)}
                >
                  <div className="location-card__top">
                    <strong>{catalog.name}</strong>
                    <span className="pill-inline">{(catalog.products || []).length} produit(s)</span>
                  </div>
                  <span>{catalog.description || "Aucune description"}</span>
                  <small>
                    {(catalog.locations || []).length
                      ? `Lieux : ${catalog.locations.map((location) => location.name).join(", ")}`
                      : "Aucun lieu associé"}
                  </small>
                </button>
                <button
                  type="button"
                  className="button button--ghost button--danger location-card__delete"
                  disabled={deletingCatalogId === catalog.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteCatalog(catalog);
                  }}
                >
                  {deletingCatalogId === catalog.id ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            ))}
            {!catalogs.length ? (
              <div className="empty-state">
                Aucun catalogue pour le moment. Crée un catalogue, associe-le à un lieu, puis ajoute des produits.
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel panel--wide">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Nouveautés</p>
              <h2>Nouveaux produits</h2>
            </div>
          </div>

          <p className="section-copy">
            Liste de tous les produits marqués comme « nouveau ». Coche la case correspondante dans la fiche produit
            (depuis un catalogue) pour l'ajouter ou le retirer de cette liste.
          </p>

          <div className="product-grid">
            {newProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className="product-card product-card--clickable"
                onClick={() => handleToggleProductIsNew(product)}
                disabled={loading}
                title="Cliquer pour retirer ce produit des nouveautés"
              >
                {product.imageUrl ? (
                  <img className="product-card__image" src={product.imageUrl} alt={product.name} />
                ) : (
                  <div className="product-card__image product-card__image--placeholder">Pas d'image</div>
                )}
                <div className="product-card__body">
                  <strong>
                    {product.name}
                    <span className="pill-inline pill-inline--new">Nouveau</span>
                  </strong>
                  <span>{product.description || "Aucune description"}</span>
                  <small>{formatVariantsDisplay(product.variants)}</small>
                </div>
              </button>
            ))}
            {!newProducts.length ? (
              <div className="empty-state">Aucun produit marqué comme nouveau pour le moment.</div>
            ) : null}
          </div>
        </section>

        <section className="panel panel--wide">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Magasin</p>
              <h2>Informations générales</h2>
            </div>
          </div>

          <p className="section-copy">
            Renseigne ici les horaires, coordonnées, événements ou informations utiles que le robot doit savoir donner.
          </p>

          <div className="two-columns">
            <div className="info-list">
              {storeInfo.map((entry) => (
                <button
                  key={entry.id}
                  className="info-card"
                  onClick={() => setStoreInfoForm(mapStoreInfoToForm(entry))}
                >
                  <strong>{entry.title}</strong>
                  <span>{entry.kind}</span>
                  <small>{entry.value}</small>
                </button>
              ))}
            </div>

            <form className="form-grid" onSubmit={handleStoreInfoSubmit}>
              <label className="field">
                <span>Titre</span>
                <input
                  value={storeInfoForm.title}
                  onChange={(event) => setStoreInfoForm({ ...storeInfoForm, title: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Type</span>
                <select
                  value={storeInfoForm.kind}
                  onChange={(event) => setStoreInfoForm({ ...storeInfoForm, kind: event.target.value })}
                >
                  <option value="general">Général</option>
                  <option value="hours">Horaires</option>
                  <option value="phone">Téléphone</option>
                  <option value="email">Email</option>
                  <option value="event">Événement</option>
                  <option value="service">Service</option>
                  <option value="policy">Politique</option>
                </select>
              </label>
              <label className="field field--full">
                <span>Valeur</span>
                <textarea
                  rows="5"
                  value={storeInfoForm.value}
                  onChange={(event) => setStoreInfoForm({ ...storeInfoForm, value: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Début</span>
                <input
                  type="datetime-local"
                  value={storeInfoForm.startsAt}
                  onChange={(event) => setStoreInfoForm({ ...storeInfoForm, startsAt: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Fin</span>
                <input
                  type="datetime-local"
                  value={storeInfoForm.endsAt}
                  onChange={(event) => setStoreInfoForm({ ...storeInfoForm, endsAt: event.target.value })}
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={storeInfoForm.isActive}
                  onChange={(event) => setStoreInfoForm({ ...storeInfoForm, isActive: event.target.checked })}
                />
                <span>Information active</span>
              </label>
              <button className="button" type="submit" disabled={loading}>
                Enregistrer l'information
              </button>
            </form>
          </div>
        </section>
      </div>

      <RobotLocationModal
        isOpen={isRobotLocationModalOpen}
        locationForm={locationForm}
        loading={loading}
        onClose={() => setIsRobotLocationModalOpen(false)}
        onLocationFormChange={setLocationForm}
        onSubmit={handleRobotLocationModalSubmit}
      />
      <ManualLocationModal
        isOpen={isManualLocationModalOpen}
        locationForm={locationForm}
        loading={loading}
        onClose={() => setIsManualLocationModalOpen(false)}
        onLocationFormChange={setLocationForm}
        onSubmit={handleManualLocationModalSubmit}
      />
      <CatalogModal
        isOpen={isCatalogModalOpen}
        catalogForm={catalogForm}
        locations={locations}
        selectedLocationIds={catalogLocationIds}
        products={catalogs.find((catalog) => String(catalog.id) === String(catalogForm.id))?.products || []}
        loading={loading}
        onClose={() => setIsCatalogModalOpen(false)}
        onCatalogFormChange={setCatalogForm}
        onToggleLocation={toggleCatalogLocation}
        onSubmit={handleCatalogSubmit}
        onAddProduct={openNewProductModal}
        onEditProduct={openExistingProductModal}
        onDeleteProduct={handleDeleteProductFromCatalog}
      />
      <ProductModal
        isOpen={isProductModalOpen}
        productForm={productForm}
        loading={loading}
        imageUploading={imageUploading}
        onClose={() => setIsProductModalOpen(false)}
        onProductFormChange={setProductForm}
        onImageFileSelected={handleProductImageSelected}
        onSubmit={handleProductSubmit}
      />
    </div>
  );
}

export default App;
