import { permanentRedirect } from "next/navigation"

// The documentation now lives at /documentation. Keep /docs working for any
// existing links or bookmarks by permanently (308) redirecting to it.
export default function DocsPage() {
  permanentRedirect("/documentation")
}
