import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  type?: string;
  image?: string;
  noindex?: boolean;
}

const SITE_NAME = "Prof en Ligne";
const BASE_URL = "https://profenligne.com";
const DEFAULT_DESC =
  "Prof en Ligne : réservez des cours particuliers avec les meilleurs tuteurs, utilisez l'IA pour vos devoirs et progressez chaque jour.";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

export function SEO({
  title,
  description = DEFAULT_DESC,
  path = "/",
  type = "website",
  image = DEFAULT_IMAGE,
  noindex = false,
}: SEOProps) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Tutorat Interactif`;
  const url = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fr_FR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
