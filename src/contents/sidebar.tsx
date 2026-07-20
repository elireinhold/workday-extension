import { useState } from "react"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import cssText from "data-text:./sidebar.css"
import { Sidebar } from "../components/Sidebar/Sidebar"

export const config: PlasmoCSConfig = {
  matches: ["https://wd5.myworkday.com/stevens/*"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export default function SidebarContainer() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {!open && (
        <button id="stevens-scheduler-toggle" onClick={() => setOpen(true)}>
          QuackScheduler
        </button>
      )}
      {open && <Sidebar onClose={() => setOpen(false)} />}
    </>
  )
}