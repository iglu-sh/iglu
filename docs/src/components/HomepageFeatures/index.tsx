import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

type FeatureItem = {
    title: string;
    description: ReactNode;
    buttonTitle?: string;
    buttonDestination?: string;
};

const FeatureList: FeatureItem[] = [
    {
        title: "Cache",
        description: (
            <>
                The Iglu-Cache is a <a href="https://cachix.org">Cachix</a> compatible cache, with
                deduplication and support for different databases and storage backends.
            </>
        ),
        buttonTitle: "Setup Cache",
        buttonDestination: "docs/cache/getting-started",
    },
    {
        title: "Builder",
        description: (
            <>
                The Iglu-Builder is a nix derivation builder which can directly push its results to
                a cachix compatible cache and can be monitored via a websocket.
            </>
        ),
        buttonTitle: "Setup Builder",
        buttonDestination: "docs/builder/getting-started",
    },
];

function Feature({
    title,
    description,
    buttonTitle = undefined,
    buttonDestination = undefined,
}: FeatureItem) {
    return (
        <div className={clsx("col col--4")}>
            <div className="text--center padding-horiz--md">
                <Heading as="h3">{title}</Heading>
                <p>{description}</p>
                {buttonTitle && buttonDestination ? (
                    <div className={styles.buttons}>
                        <Link
                            className="button button--secondary button--lg"
                            to={buttonDestination}
                        >
                            {buttonTitle}
                        </Link>
                    </div>
                ) : (
                    <></>
                )}
            </div>
        </div>
    );
}

export default function HomepageFeatures(): ReactNode {
    return (
        <section className={styles.features}>
            <div className="container">
                <div className="row">
                    {FeatureList.map((props, idx) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: static list
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    );
}
