import type {Metadata} from "next";
import "./globals.css";

export const metadata:Metadata={
 title:"RailVista — Live train search, beautifully planned",
 description:"Search date-specific Indian trains with live seat availability, fares, timings and running information.",
};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>{children}</body></html>;
}
