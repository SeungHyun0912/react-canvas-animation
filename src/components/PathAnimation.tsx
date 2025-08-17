/* eslint-disable keyword-spacing, space-in-parens */
import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * PathAnimation – Step 4
 * ------------------------------------------------------------
 * • Line / Quadratic Bézier / Arc segments
 * • Multiple moving objects with collision + direction arrows
 * • Drag handles on canvas to edit the path interactively
 * ------------------------------------------------------------
 * 4-space indentation is enforced via ESLint settings.
 */

/* ---------- Types ---------- */
export type Point = { x: number; y: number };

export interface LineSegment {
    type: "line";
    from: Point;
    to: Point;
}

export interface BezierSegment {
    type: "bezier";
    from: Point;
    cp: Point;          // single control point
    to: Point;
}

export interface ArcSegment {
    type: "arc";
    center: Point;
    radius: number;
    startAngle: number; // rad
    endAngle: number;   // rad
}

export type PathSegment = LineSegment | BezierSegment | ArcSegment;
export interface PathObject { segments: PathSegment[]; }

export interface MovingObject {
    radius: number;
    color: string;
    speed: number;  // px / sec
    phase: number;  // 0-1
}

/* ---------- Math helpers ---------- */
const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
const dist  = (p: Point, q: Point) => Math.hypot(q.x - p.x, q.y - p.y);

const pointOnLine = (p: Point, q: Point, t: number): Point => ({
    x: lerp(p.x, q.x, t),
    y: lerp(p.y, q.y, t),
});

const pointOnBezier = (s: BezierSegment, t: number): Point => {
    const u = 1 - t;
    const { from: p0, cp: p1, to: p2 } = s;
    return {
        x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    };
};

const pointOnArc = (s: ArcSegment, t: number): Point => {
    const ang = lerp(s.startAngle, s.endAngle, t);
    return {
        x: s.center.x + s.radius * Math.cos(ang),
        y: s.center.y + s.radius * Math.sin(ang),
    };
};

const pointOnSeg = (seg: PathSegment, t: number): Point => (
    seg.type === "line"   ? pointOnLine(seg.from, seg.to, t) :
        seg.type === "bezier" ? pointOnBezier(seg, t) : pointOnArc(seg, t)
);

const bezierLen = (s: BezierSegment, n = 20): number => {
    let len = 0, prev = s.from;
    for (let i = 1; i <= n; i++) {
        const p = pointOnBezier(s, i / n); len += dist(prev, p); prev = p;
    }
    return len;
};

const segLen = (seg: PathSegment): number => (
    seg.type === "line"   ? dist(seg.from, seg.to) :
        seg.type === "bezier" ? bezierLen(seg) : Math.abs(seg.endAngle - seg.startAngle) * seg.radius
);

const totalLen = (path: PathObject): number =>
    path.segments.reduce((acc, s) => acc + segLen(s), 0);

const pointOnPath = (path: PathObject, t: number): Point => {
    const tgt = totalLen(path) * t;
    let acc = 0;
    for (const s of path.segments) {
        const l = segLen(s);
        if (acc + l >= tgt) return pointOnSeg(s, (tgt - acc) / l);
        acc += l;
    }
    return pointOnSeg( path.segments.at( -1 )!, 1 );
};

/* ---------- React Component ---------- */
const PathAnimation: React.FC = () => {
    const canvasRef   = useRef<HTMLCanvasElement>(null);
    const prevTimeRef = useRef<number>(0);
    const reqRef      = useRef<number>(0);

    /* ----- editable path state ----- */
    const [ path, setPath ] = useState<PathObject>({
        segments: [
            { type: "line",   from: { x: 80,  y: 60  }, to: { x: 320, y: 60  } },
            { type: "line",   from: { x: 320, y: 60  }, to: { x: 320, y: 220 } },
            { type: "arc",    center: { x: 200, y: 220 }, radius: 120, startAngle: 0, endAngle: Math.PI },
            { type: "bezier", from: { x: 80,  y: 220 }, cp: { x: 80, y: 60 }, to: { x: 80, y: 60 } },
        ],
    });

    /* ----- moving objects ----- */
    const objects: MovingObject[] = [
        { radius: 6, color: "#3498db", speed: 100, phase: 0.0 },
        { radius: 6, color: "#e67e22", speed: 120, phase: 0.3 },
    ];

    /* ----- drag handling ----- */
    interface Handle { x: number; y: number; seg: number; key: "from" | "to" | "cp" | "center"; }
    const [ dragging, setDragging ] = useState<Handle | null>(null);

    const handles = useCallback((p: PathObject): Handle[] => {
        const arr: Handle[] = [ ];
        p.segments.forEach((s, i) => {
            if (s.type === "line") {
                arr.push({ x: s.from.x, y: s.from.y, seg: i, key: "from" });
                arr.push({ x: s.to.x,   y: s.to.y,   seg: i, key: "to"   });
            } else if (s.type === "bezier") {
                arr.push({ x: s.from.x, y: s.from.y, seg: i, key: "from" });
                arr.push({ x: s.cp.x,   y: s.cp.y,   seg: i, key: "cp"   });
                arr.push({ x: s.to.x,   y: s.to.y,   seg: i, key: "to"   });
            } else { // arc
                arr.push({ x: s.center.x, y: s.center.y, seg: i, key: "center" });
            }
        });
        return arr;
    }, [ ]);

    const mousePos = ( e: React.MouseEvent<HTMLCanvasElement> ): Point => {
        const rect = e.currentTarget.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = ( e: React.MouseEvent<HTMLCanvasElement> ): void => {
        const m = mousePos(e);
        const h = handles(path).find((hd) => dist(hd, m) < 8);
        if (h) setDragging(h);
    };

    const onMove = ( e: React.MouseEvent<HTMLCanvasElement> ): void => {
        if (!dragging) return;
        const m = mousePos(e);
        setPath(( prev ) => {
            const seg = { ...prev.segments[ dragging.seg ] } as PathSegment;
            if (seg.type === "arc") {
                if (dragging.key === "center") seg.center = m;
            } else {
                // @ts-expect-error – keys match segment type
                seg[ dragging.key ] = m;
            }
            const segs = [ ...prev.segments ];
            segs[ dragging.seg ] = seg;
            return { segments: segs };
        });
    };

    const onUp = (): void => setDragging(null);

    /* ----- drawing helpers ----- */
    const drawPath = ( ctx: CanvasRenderingContext2D ): void => {
        ctx.beginPath();
        path.segments.forEach(( s ) => {
            if ( s.type === "line" ) {
                ctx.moveTo(s.from.x, s.from.y);
                ctx.lineTo(s.to.x,   s.to.y  );
            } else if (s.type === "bezier") {
                ctx.moveTo(s.from.x, s.from.y);
                ctx.quadraticCurveTo(s.cp.x, s.cp.y, s.to.x, s.to.y);
            } else {
                ctx.arc(s.center.x, s.center.y, s.radius, s.startAngle, s.endAngle);
            }
        });
        ctx.strokeStyle = "#888";
        ctx.lineWidth   = 1;
        ctx.stroke();
    };

    const drawHandles = ( ctx: CanvasRenderingContext2D ): void => {
        ctx.fillStyle = "#e74c3c";
        handles(path).forEach(( h ) => {
            ctx.beginPath();
            ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const drawArrow = ( ctx: CanvasRenderingContext2D, p: Point, dir: Point ): void => {
        const len = 15;
        const ang = Math.atan2(dir.y, dir.x);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, 0);
        ctx.moveTo(len - 4, -4);
        ctx.lineTo(len, 0);
        ctx.lineTo(len - 4, 4);
        ctx.strokeStyle = "#333";
        ctx.stroke();
        ctx.restore();
    };

    /* ----- animation frame ----- */
    const frame = useCallback(( time: number ) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx    = canvas.getContext("2d"); if (!ctx) return;

        if (!prevTimeRef.current) prevTimeRef.current = time;
        const dt = (time - prevTimeRef.current) / 1000;
        prevTimeRef.current = time;

        ctx.clearRect( 0, 0, canvas.width, canvas.height );
        drawPath(ctx);
        drawHandles(ctx);

        const plen = totalLen(path);
        const pos: Point[] = [ ];

        objects.forEach(( o, i ) => {
            o.phase = (o.phase + (o.speed * dt) / plen) % 1;
            pos[ i ]  = pointOnPath(path, o.phase);
        });

        const collided = objects.map( () => false );
        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                if (dist(pos[ i ], pos[ j ]) < objects[ i ].radius + objects[ j ].radius) {
                    collided[ i ] = collided[ j ] = true;
                }
            }
        }

        objects.forEach(( o, i ) => {
            const p = pos[ i ];
            const q = pointOnPath( path, (o.phase + 0.002) % 1 );
            drawArrow(ctx, p, { x: q.x - p.x, y: q.y - p.y });

            ctx.beginPath();
            ctx.arc( p.x, p.y, o.radius, 0, Math.PI * 2 );
            ctx.fillStyle = collided[ i ] ? "#f1c40f" : o.color;
            ctx.fill();
            ctx.strokeStyle = "#333";
            ctx.stroke();
        });

        reqRef.current = requestAnimationFrame(frame);
    }, [ path ]);

    /* ----- lifecycle ----- */
    useEffect( () => {
        reqRef.current = requestAnimationFrame( frame );
        return () => cancelAnimationFrame(reqRef.current);
    }, [ frame ]);

    /* ----- JSX ----- */
    return (
        <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border"
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={onUp}
        />
    );
};

export default PathAnimation;