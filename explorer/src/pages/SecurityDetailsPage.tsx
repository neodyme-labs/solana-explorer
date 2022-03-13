import { PublicKey } from "@solana/web3.js";
import { ErrorCard } from "components/common/ErrorCard";
import { LoadingCard } from "components/common/LoadingCard";
import { TableCardBody } from "components/common/TableCardBody";
import MarkdownIt from "markdown-it";
import { Account, useAccountInfo, useFetchAccountInfo } from "providers/accounts";
import { useFlaggedAccounts } from "providers/accounts/flagged-accounts";
import { CacheEntry, FetchStatus } from "providers/cache";
import { ClusterStatus, useCluster } from "providers/cluster";
import React from "react";
import { useLocation } from "react-router-dom";
import { fromProgramData, SecurityTXT } from "utils/security-txt";

type Props = { address: string };
export function SecurityDetailsPage({ address }: Props) {
    const fetchAccount = useFetchAccountInfo();
    const { status } = useCluster();
    const info = useAccountInfo(address);
    let pubkey: PublicKey | undefined;

    try {
        pubkey = new PublicKey(address);
    } catch (err) { }

    // Fetch account on load
    React.useEffect(() => {
        if (!info && status === ClusterStatus.Connected && pubkey) {
            fetchAccount(pubkey);
        }
    }, [address, status]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="container mt-n3">
            <div className="header">
                <div className="header-body">
                    <h6 className="header-pretitle">Details</h6>
                    <h2 className="header-title">Security</h2>
                </div>
            </div>
            {
                !pubkey ?
                    <ErrorCard text={`Address "${address}" is not valid`} />
                    : <SecurityDetails pubkey={pubkey} info={info} />
            }
        </div>
    );
}

enum DisplayType {
    String,
    URL,
    Date,
    Contacts,
    PGP,
    Markdown
}
type TableRow = {
    display: string,
    key: keyof SecurityTXT,
    type: DisplayType
}

const ROWS: TableRow[] = [
    {
        display: "Name",
        key: "name",
        type: DisplayType.String
    },
    {
        display: "Project URL",
        key: "project_url",
        type: DisplayType.URL
    },
    {
        display: "Source Code URL",
        key: "source_code",
        type: DisplayType.URL
    },
    {
        display: "Expiry",
        key: "expiry",
        type: DisplayType.Date
    },
    {
        display: "Preferred Languages",
        key: "preferred_languages",
        type: DisplayType.String
    },
    {
        display: "Contacts",
        key: "contacts",
        type: DisplayType.Contacts
    },
    {
        display: "Encryption",
        key: "encryption",
        type: DisplayType.PGP,
    },
    {
        display: "Acknowledgements",
        key: "acknowledgements",
        type: DisplayType.Markdown,
    },
    {
        display: "Policy",
        key: "policy",
        type: DisplayType.Markdown,
    },
]

function SecurityDetails({
    pubkey,
    info,
}: {
    pubkey: PublicKey;
    info?: CacheEntry<Account>;
}) {

    const fetchAccount = useFetchAccountInfo();

    if (!info || info.status === FetchStatus.Fetching) {
        return <LoadingCard />;
    } else if (
        info.status === FetchStatus.FetchFailed ||
        info.data?.lamports === undefined
    ) {
        return <ErrorCard retry={() => fetchAccount(pubkey)} text="Fetch Failed" />;
    }
    const account = info.data;

    const data = account?.details?.data;
    if (!data || data.program !== "bpf-upgradeable-loader" || !data.programData) {
        return <ErrorCard text="Account is not a program" />
    }

    const securityTXT = fromProgramData(data.programData);

    if (!securityTXT) {
        return <ErrorCard text="Account has no security.txt" />
    }

    return <div className="card">
        <div className="card-header">
            <h3 className="card-header-title mb-0 d-flex align-items-center">
                Overview
            </h3>
        </div>
        <TableCardBody>
            {
                ROWS.filter(x => x.key in securityTXT).map(x => {
                    return <tr>
                        <td className="w-100">{x.display}</td>
                        <RenderEntry value={securityTXT[x.key]} type={x.type} />
                    </tr>
                })
            }
        </TableCardBody>
    </div>
}

function RenderEntry({ value, type }: { value: SecurityTXT[keyof SecurityTXT], type: DisplayType }) {
    switch (type) {
        case DisplayType.String:
            return <td className="text-lg-end font-monospace" style={{ whiteSpace: "unset" }}>
                {value}
            </td>
        case DisplayType.Contacts:
            return <td className="text-lg-end font-monospace" style={{ whiteSpace: "unset" }}>
                <ul style={{ listStyle: "none" }}>
                    {value?.split(",").map(c => {
                        const [type, information] = c.split(":", 2);
                        return <li>
                            <Contact type={type} information={information} />
                        </li>
                    })}
                </ul>
            </td>
        case DisplayType.URL:
            return <td className="text-lg-end"><span className="font-monospace">
                <a href={value}>{value}</a>
            </span></td>
        case DisplayType.Markdown:
            const md = MarkdownIt({
                linkify: true
            })

            return <td className="font-monospace" style={{ whiteSpace: "pre-wrap", display: "block" }}>
                {value ? <div dangerouslySetInnerHTML={{ __html: md.render(value) }} /> : undefined}
            </td>
        case DisplayType.Date:
            return <td className="text-lg-end font-monospace" style={{ whiteSpace: "unset" }}>
                {value}
            </td>
        case DisplayType.PGP:
            return <td>
                <code style={{ whiteSpace: "pre-wrap", display: "block" }}>
                    {value}
                </code>
            </td>
        default:
            break;
    }
    return <></>
}

function Contact({ type, information }: { type: string, information: string }) {
    switch (type) {
        case "discord":
            return <a href={`https://discordapp.com/users/${information}`}>Discord</a>
        case "email":
            return <a href={`mailto:${information}`}>E-Mail</a>
        case "telegram":
            return <a href={`https://t.me/${information}`}>Telegram</a>
        case "twitter":
            return <a href={`https://twitter.com/${information}`}>Twitter</a>
        case "link":
            return <a href={`${information}`}>{information}</a>
        case "other":
        default:
            return <>{type}:{information}</>
    }
}
