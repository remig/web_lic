Shader "Hidden/JumpFloodOutline"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
    }
    SubShader
    {
        Tags { "PreviewType" = "Plane" }
        Cull Off ZWrite Off ZTest Always

        CGINCLUDE
        // just inside the precision of a R16G16_SNorm to keep encoded range 1.0 >= and > -1.0
        #define SNORM16_MAX_FLOAT_MINUS_EPSILON ((float)(32768-2) / (float)(32768-1))
        #define FLOOD_ENCODE_OFFSET float2(1.0, SNORM16_MAX_FLOAT_MINUS_EPSILON)
        #define FLOOD_ENCODE_SCALE float2(2.0, 1.0 + SNORM16_MAX_FLOAT_MINUS_EPSILON)

        #define FLOOD_NULL_POS -1.0
        #define FLOOD_NULL_POS_FLOAT2 float2(FLOOD_NULL_POS, FLOOD_NULL_POS)
        ENDCG
        
        Pass // 0
        {
            Name "INNERSTENCIL"

            Stencil {
                Ref 1
                ReadMask 1
                WriteMask 1
                Comp NotEqual
                Pass Replace
            }

            ColorMask 0
            Blend Zero One

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            #pragma target 4.5

            float4 vert (float4 vertex : POSITION) : SV_POSITION
            {
                return UnityObjectToClipPos(vertex);
            }

            // null frag
            void frag () {}
            ENDCG
        }

        Pass // 1
        {
            Name "BUFFERFILL"

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            #pragma target 4.5

            struct appdata
            {
                float4 vertex : POSITION;
            };

            float4 vert (appdata v) : SV_POSITION
            {
                float4 pos = UnityObjectToClipPos(v.vertex);

                // flip the rendering "upside down" in non OpenGL to make things easier later
                // you'll notice none of the later passes need to pass UVs
                #ifdef UNITY_UV_STARTS_AT_TOP
                pos.y = -pos.y;
                #endif

                return pos;
            }

            half frag () : SV_Target
            {
                return 1.0;
            }
            ENDCG
        }

        Pass // 2
        {
            Name "JUMPFLOODINIT"

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            #pragma target 4.5

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
            };

            Texture2D _MainTex;
            float4 _MainTex_TexelSize;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                return o;
            }

            float2 frag (v2f i) : SV_Target {
                // integer pixel position
                int2 uvInt = i.pos.xy;

                // sample silhouette texture for sobel
                half3x3 values;
                UNITY_UNROLL
                for(int u=0; u<3; u++)
                {
                    UNITY_UNROLL
                    for(int v=0; v<3; v++)
                    {
                        uint2 sampleUV = clamp(uvInt + int2(u-1, v-1), int2(0,0), (int2)_MainTex_TexelSize.zw - 1);
                        values[u][v] = _MainTex.Load(int3(sampleUV, 0)).r;
                    }
                }

                // calculate output position for this pixel
                float2 outPos = i.pos.xy * abs(_MainTex_TexelSize.xy) * FLOOD_ENCODE_SCALE - FLOOD_ENCODE_OFFSET;

                // interior, return position
                if (values._m11 > 0.99)
                    return outPos;

                // exterior, return no position
                if (values._m11 < 0.01)
                    return FLOOD_NULL_POS_FLOAT2;

                // sobel to estimate edge direction
                float2 dir = -float2(
                    values[0][0] + values[0][1] * 2.0 + values[0][2] - values[2][0] - values[2][1] * 2.0 - values[2][2],
                    values[0][0] + values[1][0] * 2.0 + values[2][0] - values[0][2] - values[1][2] * 2.0 - values[2][2]
                    );

                // if dir length is small, this is either a sub pixel dot or line
                // no way to estimate sub pixel edge, so output position
                if (abs(dir.x) <= 0.005 && abs(dir.y) <= 0.005)
                    return outPos;

                // normalize direction
                dir = normalize(dir);

                // sub pixel offset
                float2 offset = dir * (1.0 - values._m11);

                // output encoded offset position
                return (i.pos.xy + offset) * abs(_MainTex_TexelSize.xy) * FLOOD_ENCODE_SCALE - FLOOD_ENCODE_OFFSET;
            }
            ENDCG
        }

        Pass // 3
        {
            Name "JUMPFLOOD"

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            #pragma target 4.5

            struct appdata
            {
                float4 vertex : POSITION;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
            };

            Texture2D _MainTex;
            float4 _MainTex_TexelSize;
            int _StepWidth;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                return o;
            }

            float2 frag (v2f i) : SV_Target {
                // integer pixel position
                int2 uvInt = int2(i.pos.xy);

                // initialize best distance at infinity
                float bestDist = 1.#INF;
                float2 bestCoord;

                // jump samples
                UNITY_UNROLL
                for(int u=-1; u<=1; u++)
                {
                    UNITY_UNROLL
                    for(int v=-1; v<=1; v++)
                    {
                        // calculate offset sample position
                        int2 offsetUV = uvInt + int2(u, v) * _StepWidth;

                        // .Load() acts funny when sampling outside of bounds, so don't
                        offsetUV = clamp(offsetUV, int2(0,0), (int2)_MainTex_TexelSize.zw - 1);

                        // decode position from buffer
                        float2 offsetPos = (_MainTex.Load(int3(offsetUV, 0)).rg + FLOOD_ENCODE_OFFSET) * _MainTex_TexelSize.zw / FLOOD_ENCODE_SCALE;

                        // the offset from current position
                        float2 disp = i.pos.xy - offsetPos;

                        // square distance
                        float dist = dot(disp, disp);

                        // if offset position isn't a null position or is closer than the best
                        // set as the new best and store the position
                        if (offsetPos.y != FLOOD_NULL_POS && dist < bestDist)
                        {
                            bestDist = dist;
                            bestCoord = offsetPos;
                        }
                    }
                }

                // if not valid best distance output null position, otherwise output encoded position
                return isinf(bestDist) ? FLOOD_NULL_POS_FLOAT2 : bestCoord * _MainTex_TexelSize.xy * FLOOD_ENCODE_SCALE - FLOOD_ENCODE_OFFSET;
            }
            ENDCG
        }

        Pass // 4
        {
            Name "JUMPFLOOD_SINGLEAXIS"

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            #pragma target 4.5

            struct appdata
            {
                float4 vertex : POSITION;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
            };

            Texture2D _MainTex;
            float4 _MainTex_TexelSize;
            int2 _AxisWidth;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                return o;
            }

            half2 frag (v2f i) : SV_Target {
                // integer pixel position
                int2 uvInt = int2(i.pos.xy);

                // initialize best distance at infinity
                float bestDist = 1.#INF;
                float2 bestCoord;

                // jump samples
                // only one loop
                UNITY_UNROLL
                for(int u=-1; u<=1; u++)
                {
                    // calculate offset sample position
                    int2 offsetUV = uvInt + _AxisWidth * u;

                    // .Load() acts funny when sampling outside of bounds, so don't
                    offsetUV = clamp(offsetUV, int2(0,0), (int2)_MainTex_TexelSize.zw - 1);

                    // decode position from buffer
                    float2 offsetPos = (_MainTex.Load(int3(offsetUV, 0)).rg + FLOOD_ENCODE_OFFSET) * _MainTex_TexelSize.zw / FLOOD_ENCODE_SCALE;

                    // the offset from current position
                    float2 disp = i.pos.xy - offsetPos;

                    // square distance
                    float dist = dot(disp, disp);

                    // if offset position isn't a null position or is closer than the best
                    // set as the new best and store the position
                    if (offsetPos.x != -1.0 && dist < bestDist)
                    {
                        bestDist = dist;
                        bestCoord = offsetPos;
                    }
                }

                // if not valid best distance output null position, otherwise output encoded position
                return isinf(bestDist) ? FLOOD_NULL_POS_FLOAT2 : bestCoord * _MainTex_TexelSize.xy * FLOOD_ENCODE_SCALE - FLOOD_ENCODE_OFFSET;
            }
            ENDCG
        }

        Pass // 5
        {
            Name "JUMPFLOODOUTLINE"

            Stencil {
                Ref 1
                ReadMask 1
                WriteMask 1
                Comp NotEqual
                Pass Zero
                Fail Zero
            }

            Blend SrcAlpha OneMinusSrcAlpha

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            #pragma target 4.5

            struct appdata
            {
                float4 vertex : POSITION;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
            };

            Texture2D _MainTex;

            half4 _OutlineColor;
            float _OutlineWidth;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                return o;
            }

            half4 frag (v2f i) : SV_Target {
                // integer pixel position
                int2 uvInt = int2(i.pos.xy);

                // load encoded position
                float2 encodedPos = _MainTex.Load(int3(uvInt, 0)).rg;

                // early out if null position
                if (encodedPos.y == -1)
                    return half4(0,0,0,0);

                // decode closest position
                float2 nearestPos = (encodedPos + FLOOD_ENCODE_OFFSET) * abs(_ScreenParams.xy) / FLOOD_ENCODE_SCALE;

                // current pixel position
                float2 currentPos = i.pos.xy;

                // distance in pixels to closest position
                half dist = length(nearestPos - currentPos);

                // calculate outline
                // + 1.0 is because encoded nearest position is half a pixel inset
                // not + 0.5 because we want the anti-aliased edge to be aligned between pixels
                // distance is already in pixels, so this is already perfectly anti-aliased!
                half outline = saturate(_OutlineWidth - dist + 1.0);

                // apply outline to alpha
                half4 col = _OutlineColor;
                col.a *= outline;

                // profit!
                return col;
            }
            ENDCG
        }
    }
}