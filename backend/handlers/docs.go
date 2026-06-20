package handlers

import (
	"net/http"
	"os"
)

// ServeDocsHTML serves the Redoc HTML page
func ServeDocsHTML(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	html := `<!DOCTYPE html>
<html>
  <head>
    <title>OALCDA Attendance Portal API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <redoc spec-url='/api/docs/openapi.json'></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"> </script>
  </body>
</html>`

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(html))
}

// ServeOpenAPIJSON serves the OpenAPI specification JSON file
func ServeOpenAPIJSON(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Try multiple relative and absolute path locations to locate openapi.json robustly
	paths := []string{
		"docs/openapi.json",
		"backend/docs/openapi.json",
		"../docs/openapi.json",
		"../backend/docs/openapi.json",
		"../../docs/openapi.json",
		"/home/jd33n27/Desktop/work/fullstack/attendance_project/backend/docs/openapi.json",
	}

	var data []byte
	var err error
	for _, p := range paths {
		data, err = os.ReadFile(p)
		if err == nil {
			break
		}
	}

	if err != nil {
		RespondWithError(w, http.StatusNotFound, "OpenAPI specification file not found: "+err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
